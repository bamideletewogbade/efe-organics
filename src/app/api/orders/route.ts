import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { customers, orderItems, orders } from "@/db/schema";
import { getProduct, sizeLabel } from "@/lib/catalog";
import { makeReference, REGIONS } from "@/lib/checkout";
import { recordDiscountUse, resolveDiscount } from "@/lib/discounts";
import { logger } from "@/lib/logger";
import { notifyNewOrder } from "@/lib/notify";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { quoteDelivery, quoteTax } from "@/lib/settings";

/**
 * Places an order.
 *
 * This endpoint is the piece the whole back office was waiting on. Until it
 * existed, checkout composed an order in the browser and handed it to the
 * customer as an email draft: the orders screen, the order detail screen, the
 * delivery quote, revenue on the dashboard and the customers list were all
 * reading from a table nothing ever wrote to.
 *
 * THE CLIENT SENDS SLUGS AND QUANTITIES. NOTHING ELSE.
 *
 * No prices, no totals, no product names. Every one of those is re-read here
 * from the catalogue and recomputed. This is the same rule the cart and the
 * checkout model already follow, and it is the difference between a shop and a
 * shop that will sell someone a GH₵115 refill for one pesewa because they
 * edited a form field.
 *
 * STOCK IS NOT DECREMENTED HERE.
 *
 * Payment is not live: an order is a reservation that gets confirmed by phone.
 * Taking stock at placement would let an abandoned reservation hold inventory
 * that nobody is going to buy. Stock moves when the order is marked paid, which
 * is when the sale is real. The trade-off is that two people can reserve the
 * last bar; at this volume a phone call resolves that, and silently
 * overpromising stock is the worse failure.
 */

const log = logger.child({ route: "api/orders" });

const MAX_LINES = 40;
const MAX_QTY_PER_LINE = 99;

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  /*
    Placing an order is expensive: it writes three tables and sends mail. Ten a
    minute is far above what any real shopper does and low enough that a retry
    loop cannot fill the table. See lib/rate-limit.ts for what this does and
    does not protect against.
  */
  const limit = rateLimit(clientKey(request, "orders"), 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const db = getDb();
  if (!db) {
    // No database. The checkout keeps its email/WhatsApp handoff, so say so
    // plainly rather than pretending the order was stored.
    return NextResponse.json(
      { ok: false, reason: "not_configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  const payload = body as {
    lines?: Array<{ slug?: unknown; qty?: unknown }>;
    delivery?: Record<string, unknown>;
  };

  const rawLines = Array.isArray(payload.lines) ? payload.lines : [];
  if (rawLines.length === 0 || rawLines.length > MAX_LINES) {
    return NextResponse.json({ ok: false, reason: "no_lines" }, { status: 400 });
  }

  const d = payload.delivery ?? {};
  const region = clip(d.region, 80);
  const delivery = {
    name: clip(d.name, 200),
    phone: clip(d.phone, 40),
    email: clip(d.email, 240).toLowerCase(),
    region: (REGIONS as readonly string[]).includes(region) ? region : "",
    town: clip(d.town, 120),
    address: clip(d.address, 2000),
    notes: clip(d.notes, 2000),
  };

  if (
    !delivery.name ||
    !delivery.phone ||
    !delivery.email ||
    !delivery.region ||
    !delivery.town ||
    !delivery.address
  ) {
    return NextResponse.json(
      { ok: false, reason: "incomplete_delivery" },
      { status: 400 },
    );
  }

  try {
    /* ---- rebuild the basket from the catalogue ---- */
    const resolved: Array<{
      slug: string;
      name: string;
      size: string | null;
      unitPriceMinor: number;
      quantity: number;
      lineTotalMinor: number;
    }> = [];
    for (const line of rawLines) {
      const slug = clip(line.slug, 180);
      const qty = Math.floor(Number(line.qty));
      if (!slug || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
        continue;
      }
      const product = await getProduct(slug);
      if (!product) continue;

      resolved.push({
        slug,
        name: product.name,
        size: sizeLabel(product),
        unitPriceMinor: product.priceMinor,
        quantity: qty,
        lineTotalMinor: product.priceMinor * qty,
      });
    }

    if (resolved.length === 0) {
      return NextResponse.json(
        { ok: false, reason: "nothing_purchasable" },
        { status: 400 },
      );
    }

    const subtotalMinor = resolved.reduce((s, l) => s + l.lineTotalMinor, 0);

    /* ---- discount, evaluated here and nowhere else ---- */
    const applied = await resolveDiscount(db, {
      subtotalMinor,
      lines: resolved,
      code: clip((payload as { code?: unknown }).code, 48),
    });
    const discountMinor = applied?.amountMinor ?? 0;
    const afterDiscount = Math.max(0, subtotalMinor - discountMinor);

    /* ---- delivery, if this region has an agreed rate ---- */
    const quote = await quoteDelivery(delivery.region, afterDiscount);
    const deliveryMinor = quote.kind === "unquoted" ? null : quote.feeMinor;

    /*
      Tax is computed but will be zero until somebody turns it on.

      Ghana VAT plus the levies is not a single rate, and nobody has told us
      whether Efe is registered. So the setting defaults to off, the columns
      exist, and the rate actually charged is stored on the order rather than
      looked up at report time. An invoice from last year has to keep saying
      what was charged then, even after the rate changes.
    */
    const { taxMinor, rateBp } = await quoteTax(afterDiscount + (deliveryMinor ?? 0));
    const totalMinor = afterDiscount + (deliveryMinor ?? 0) + taxMinor;

    const reference = makeReference();

    const orderId = await db.transaction(async (tx) => {
      /* Customer record, matched on email. Upsert rather than insert so a
         returning shopper is one customer with two orders, not two customers. */
      const [customer] = await tx
        .insert(customers)
        .values({
          email: delivery.email,
          name: delivery.name,
          phone: delivery.phone,
        })
        .onConflictDoUpdate({
          target: customers.email,
          set: { name: delivery.name, phone: delivery.phone },
        })
        .returning({ id: customers.id });

      const [order] = await tx
        .insert(orders)
        .values({
          reference,
          customerId: customer?.id ?? null,
          status: "pending",
          paymentStatus: "unpaid",
          subtotalMinor,
          discountMinor,
          discountId: applied?.discountId ?? null,
          deliveryMinor,
          taxMinor,
          taxRateBp: rateBp,
          totalMinor,
          deliveryName: delivery.name,
          deliveryPhone: delivery.phone,
          deliveryEmail: delivery.email,
          deliveryRegion: delivery.region,
          deliveryTown: delivery.town,
          deliveryAddress: delivery.address,
          customerNote: delivery.notes || null,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        resolved.map((line) => ({
          orderId: order.id,
          variantId: null,
          nameSnapshot: line.name,
          sizeSnapshot: line.size,
          slugSnapshot: line.slug,
          unitPriceMinor: line.unitPriceMinor,
          quantity: line.quantity,
          lineTotalMinor: line.lineTotalMinor,
        })),
      );

      /*
        Usage is counted inside the transaction, not at resolution time. A
        checkout page that re-quotes on every render would otherwise burn a
        limited code without anyone buying anything.
      */
      if (applied) await recordDiscountUse(tx, applied.discountId);

      return order.id;
    });

    log.info("order placed", {
      orderId,
      reference,
      subtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor,
      lines: resolved.length,
      quoted: quote.kind,
    });

    /*
      Notifications are awaited rather than fired and forgotten, because the
      WhatsApp link it returns is shown on the confirmation screen. It cannot
      throw, and it caps its own network time, so the worst case is a slightly
      slower response rather than a lost order.
    */
    const notice = await notifyNewOrder(
      {
        reference,
        customerName: delivery.name,
        customerPhone: delivery.phone,
        town: delivery.town,
        region: delivery.region,
        subtotalMinor,
        discountMinor,
        deliveryMinor,
        totalMinor,
        lines: resolved.map((line) => ({
          name: line.name,
          size: line.size,
          quantity: line.quantity,
          lineTotalMinor: line.lineTotalMinor,
        })),
      },
      delivery.email,
    );

    return NextResponse.json({
      ok: true,
      reference,
      subtotalMinor,
      discountMinor,
      discount: applied
        ? { name: applied.name, label: applied.label, code: applied.code }
        : null,
      deliveryMinor,
      taxMinor,
      totalMinor,
      deliveryQuote: quote,
      lines: resolved,
      whatsappUrl: notice.whatsappUrl,
      confirmationEmailed: notice.emailedCustomer,
    });
  } catch (error) {
    log.error("order placement failed", { error });
    // The customer still gets their basket and the handoff path, so this is a
    // degraded success rather than a dead end.
    return NextResponse.json(
      { ok: false, reason: "server_error" },
      { status: 500 },
    );
  }
}
