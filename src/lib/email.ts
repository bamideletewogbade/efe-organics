import { env, capabilities } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatPrice } from "@/lib/money";

const log = logger.child({ module: "email" });

export type OrderEmailDetails = {
  reference: string;
  customerName: string | null;
  customerEmail: string;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryTown: string | null;
  deliveryRegion: string | null;
  subtotalMinor: number;
  deliveryMinor: number | null;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  items: Array<{
    name: string;
    size?: string | null;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
};

export function buildReceiptHtml(order: OrderEmailDetails): string {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e0;">
          <strong style="color: #141416;">${item.name}</strong>
          ${item.size ? `<br/><span style="font-size: 12px; color: #666660;">Size: ${item.size}</span>` : ""}
        </td>
        <td style="padding: 10px 0; text-align: center; border-bottom: 1px solid #e5e5e0; color: #141416;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #e5e5e0; font-weight: 600; color: #141416;">
          ${formatPrice(item.lineTotalMinor)}
        </td>
      </tr>
    `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Order Receipt #${order.reference} - Efe Organics</title>
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f7f6f2; color: #141416; margin: 0; padding: 24px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e5e0; overflow: hidden; padding: 32px;">
          
          <!-- Header -->
          <div style="text-align: center; border-bottom: 1px solid #e5e5e0; padding-bottom: 24px; margin-bottom: 24px;">
            <h1 style="font-family: Georgia, serif; font-size: 26px; color: #0d0d0e; margin: 0;">Efe Organics</h1>
            <p style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a84c; margin-top: 6px;">
              Life & Organics · Order Receipt
            </p>
          </div>

          <!-- Greeting -->
          <p style="font-size: 15px; line-height: 1.5; color: #141416;">
            Hello <strong>${order.customerName || "Customer"}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.5; color: #444440;">
            Thank you for your purchase! We have received your order <strong>#${order.reference}</strong> and are preparing your organic African Black Soap products for delivery.
          </p>

          <!-- Order Summary Table -->
          <h2 style="font-size: 16px; margin-top: 28px; margin-bottom: 12px; color: #0d0d0e;">Items Ordered</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="text-align: left; border-bottom: 2px solid #0d0d0e; font-size: 12px; text-transform: uppercase; color: #666660;">
                <th style="padding-bottom: 8px;">Product</th>
                <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                <th style="padding-bottom: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals Breakdown -->
          <div style="margin-top: 20px; border-top: 1px solid #e5e5e0; padding-top: 16px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #666660;">Subtotal</span>
              <span>${formatPrice(order.subtotalMinor)}</span>
            </div>
            ${
              order.discountMinor > 0
                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #2e7d32;">
                    <span>Discount</span>
                    <span>-${formatPrice(order.discountMinor)}</span>
                   </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #666660;">Delivery (${order.deliveryTown || order.deliveryRegion || "Standard"})</span>
              <span>${order.deliveryMinor !== null ? formatPrice(order.deliveryMinor) : "Quoted on dispatch"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #0d0d0e; border-top: 2px solid #0d0d0e; padding-top: 12px; margin-top: 10px;">
              <span>Total Paid</span>
              <span style="color: #c9a84c;">${formatPrice(order.totalMinor)}</span>
            </div>
          </div>

          <!-- Delivery Information -->
          <div style="margin-top: 28px; background: #f7f6f2; border-radius: 12px; padding: 16px; font-size: 13px; color: #444440;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #0d0d0e;">Delivery Address</h3>
            <p style="margin: 0; line-height: 1.4;">
              ${order.customerName || ""}<br/>
              ${order.deliveryPhone ? `Phone: ${order.deliveryPhone}<br/>` : ""}
              ${order.deliveryAddress || ""}<br/>
              ${order.deliveryTown ? `${order.deliveryTown}, ` : ""}${order.deliveryRegion || "Ghana"}
            </p>
          </div>

          <!-- Footer -->
          <div style="margin-top: 32px; text-align: center; font-size: 12px; color: #888880; border-top: 1px solid #e5e5e0; padding-top: 20px;">
            <p style="margin: 0;">Efe Organics · Handcrafted African Black Soap Skin & Hair Care</p>
            <p style="margin: 4px 0 0 0;">Accra, Ghana · WhatsApp: 024 000 0000</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendCustomerOrderEmail(
  order: OrderEmailDetails,
): Promise<{ ok: boolean; error?: string }> {
  if (!capabilities.hasEmail) {
    log.info("Email service not configured (RESEND_API_KEY missing). Receipt logged:", {
      reference: order.reference,
      customerEmail: order.customerEmail,
      total: formatPrice(order.totalMinor),
    });
    return { ok: true };
  }

  const resendApiKey = env.server.resendApiKey!;
  const fromEmail = env.server.orderEmailFrom!;

  try {
    const html = buildReceiptHtml(order);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [order.customerEmail],
        subject: `Order Receipt #${order.reference} · Efe Organics`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      log.error("Resend API failed to send receipt email", { data });
      return { ok: false, error: data.message || "Failed to send receipt email" };
    }

    log.info("Order receipt email sent to customer", {
      reference: order.reference,
      customerEmail: order.customerEmail,
      emailId: data.id,
    });

    return { ok: true };
  } catch (error) {
    log.error("Error sending order receipt email", { error });
    return { ok: false, error: "Network error sending receipt email." };
  }
}
