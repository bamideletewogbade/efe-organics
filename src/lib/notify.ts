import { brand } from "@/lib/brand";
import { capabilities, env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatPrice } from "@/lib/money";

/**
 * Telling a human that an order arrived.
 *
 * THE FAILURE THIS FIXES
 *
 * An order was written to a table and that was the end of it. Nobody was told.
 * It sat there until somebody happened to open the admin, which for a business
 * that lives in WhatsApp and not in dashboards could be the next morning or the
 * next week. A shop that takes an order and stays silent is worse than no shop,
 * because the customer believes something is happening.
 *
 * TWO CHANNELS, DELIBERATELY UNEQUAL
 *
 * 1. **WhatsApp link.** Always produced, needs no vendor, no verified domain and
 *    no paid plan. It is a `wa.me` URL with the order pre-written into it, so
 *    the order confirmation screen can offer "send this to Efe" and the customer
 *    themselves closes the loop. This works today.
 *
 * 2. **Email via Resend.** Better, because it needs nobody to press anything.
 *    Also gated: Resend refuses to send from an unverified domain, so this stays
 *    dark until DNS is done.
 *
 * The link is the floor and the email is the ceiling. Getting the floor right
 * first is what makes the shop safe to launch before the DNS is sorted.
 *
 * NOTIFICATION FAILURE MUST NEVER FAIL THE ORDER.
 *
 * Every path here is wrapped and every error is swallowed into a log line. An
 * order that is safely committed to the database is a success even if the email
 * provider is down, and throwing here would turn a stored sale into a 500 and a
 * customer who tries again.
 */

const log = logger.child({ module: "notify" });

export type OrderNotice = {
  reference: string;
  customerName: string;
  customerPhone: string;
  town: string;
  region: string;
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number | null;
  totalMinor: number;
  lines: Array<{ name: string; size: string | null; quantity: number; lineTotalMinor: number }>;
};

/** Digits only. `wa.me` rejects spaces, dashes and a leading plus. */
function normalisePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Plain-text order summary. Used by both channels, so they cannot disagree. */
export function summarise(order: OrderNotice): string {
  const lines = order.lines
    .map(
      (line) =>
        `${line.quantity} x ${line.name}${line.size ? ` (${line.size})` : ""} = ${formatPrice(line.lineTotalMinor)}`,
    )
    .join("\n");

  const money = [
    `Subtotal: ${formatPrice(order.subtotalMinor)}`,
    order.discountMinor > 0
      ? `Discount: -${formatPrice(order.discountMinor)}`
      : null,
    order.deliveryMinor === null
      ? "Delivery: to be quoted"
      : `Delivery: ${formatPrice(order.deliveryMinor)}`,
    `Total: ${formatPrice(order.totalMinor)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `New order ${order.reference}`,
    "",
    lines,
    "",
    money,
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Deliver to: ${order.town}, ${order.region}`,
  ].join("\n");
}

/**
 * A `wa.me` link that opens WhatsApp with the order already written.
 *
 * Returned to the browser so the confirmation screen can show a real button.
 * Null when no owner number is configured, in which case the screen falls back
 * to the existing email handoff.
 */
export function whatsappHandoff(order: OrderNotice): string | null {
  const to = env.server.ownerWhatsapp
    ? normalisePhone(env.server.ownerWhatsapp)
    : null;
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(summarise(order))}`;
}

/** Escapes text before it goes into an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  if (!capabilities.hasEmail) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.server.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.server.orderEmailFrom,
        to: [to],
        subject,
        text,
        html: `<pre style="font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      }),
      // A hanging mail provider must not hold an order response open.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      log.warn("order email rejected", {
        status: response.status,
        body: (await response.text()).slice(0, 400),
      });
      return false;
    }
    return true;
  } catch (error) {
    log.warn("order email failed", { error: String(error) });
    return false;
  }
}

export type NoticeResult = {
  emailedOwner: boolean;
  emailedCustomer: boolean;
  whatsappUrl: string | null;
};

/**
 * Fires every notification for a new order.
 *
 * Never throws. The caller has already committed the order and the customer is
 * waiting on the response.
 */
export async function notifyNewOrder(
  order: OrderNotice,
  customerEmail: string,
): Promise<NoticeResult> {
  const result: NoticeResult = {
    emailedOwner: false,
    emailedCustomer: false,
    whatsappUrl: whatsappHandoff(order),
  };

  const summary = summarise(order);

  // The order is logged at warn level on purpose. If every other channel is
  // unconfigured, the server log is the only record that anyone was told, and
  // it should stand out from ordinary traffic.
  log.warn("NEW ORDER", { reference: order.reference, total: order.totalMinor });

  try {
    const ownerTo = env.server.orderEmailTo ?? brand.contact.email;
    result.emailedOwner = await sendEmail(
      ownerTo,
      `New order ${order.reference} from ${order.customerName}`,
      summary,
    );

    if (customerEmail) {
      result.emailedCustomer = await sendEmail(
        customerEmail,
        `Your ${brand.name} order ${order.reference}`,
        [
          `Thank you for your order, ${order.customerName}.`,
          "",
          summary,
          "",
          order.deliveryMinor === null
            ? "We will confirm your delivery charge and the final total shortly."
            : "We will be in touch to confirm payment and delivery.",
          "",
          brand.name,
        ].join("\n"),
      );
    }
  } catch (error) {
    log.error("notification failed", { error: String(error) });
  }

  return result;
}
