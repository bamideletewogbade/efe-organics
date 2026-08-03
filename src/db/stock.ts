import { and, eq, inArray, sql } from "drizzle-orm";

import type { Executor } from "@/db/client";
import { orderItems, stockLedger, variants } from "@/db/schema";
import { logger } from "@/lib/logger";

/**
 * Stock movement for orders.
 *
 * WHEN STOCK MOVES, AND WHY IT IS NOT AT PLACEMENT
 *
 * Payment is not live yet, so an order is a reservation confirmed by phone.
 * Taking stock the moment someone reaches the last step would let abandoned
 * reservations hold inventory nobody is going to buy, and at this volume a
 * phone call resolves a double-booked last bar far better than a shop that
 * silently reports zero.
 *
 * So stock moves when an order is marked PAID, which is when the sale is real,
 * and moves back when it is cancelled or refunded.
 *
 * That was always the intent. The comment in the orders endpoint has described
 * this design since it was written. What did not exist was the other half: the
 * paid transition never actually wrote to the ledger, so stock never moved at
 * all, in either direction. This module is that missing half.
 *
 * IDEMPOTENCY IS THE WHOLE PROBLEM
 *
 * Order status is a dropdown. Somebody will set an order to paid, then packed,
 * then back to paid, and each of those is a form submission. If every one
 * decremented stock, a single order would eat inventory repeatedly and the
 * ledger, which exists specifically to be trustworthy, would be the thing
 * lying.
 *
 * So every movement is tagged with the order id in `reference` and one of two
 * reasons, and both directions check for their own marker first. Applying twice
 * is a no-op. Cancelling something that never took stock is a no-op. The ledger
 * is the source of truth about what has already happened, which is what a
 * ledger is for.
 *
 * VARIANTS ARE RESOLVED BY SLUG
 *
 * `orderItems.variantId` is null while the catalogue lives in a static file, so
 * lines are matched to variants through `slugSnapshot`. Once the repository swap
 * lands and orders carry a real variant id, the lookup below gets simpler and
 * nothing else here changes.
 */

const log = logger.child({ module: "stock" });

/**
 * Reads an order's lines and maps them onto tracked variants.
 *
 * Untracked variants (`trackStock` false, such as made-to-order raw material)
 * are dropped here rather than filtered later, so a caller cannot accidentally
 * move stock for something that deliberately does not have any.
 */
async function resolveLines(
  tx: Executor,
  orderId: string,
): Promise<Array<{ variantId: string; quantity: number; name: string }>> {
  const lines = await tx
    .select({
      variantId: orderItems.variantId,
      slug: orderItems.slugSnapshot,
      quantity: orderItems.quantity,
      name: orderItems.nameSnapshot,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (lines.length === 0) return [];

  const slugs = lines
    .map((line: { slug: string | null }) => line.slug)
    .filter((slug: string | null): slug is string => Boolean(slug));

  const bySlug = new Map<string, string>();
  if (slugs.length > 0) {
    const rows = await tx
      .select({ id: variants.id, slug: variants.slug })
      .from(variants)
      .where(
        and(inArray(variants.slug, slugs), eq(variants.trackStock, true)),
      );
    for (const row of rows as Array<{ id: string; slug: string }>) {
      bySlug.set(row.slug, row.id);
    }
  }

  const resolved: Array<{ variantId: string; quantity: number; name: string }> =
    [];
  for (const line of lines as Array<{
    variantId: string | null;
    slug: string | null;
    quantity: number;
    name: string;
  }>) {
    const variantId = line.variantId ?? (line.slug ? bySlug.get(line.slug) : undefined);
    if (!variantId) continue;
    resolved.push({ variantId, quantity: line.quantity, name: line.name });
  }
  return resolved;
}

/** True when this order already has ledger rows for the given reason. */
async function alreadyMoved(
  tx: Executor,
  orderId: string,
  reason: "order_placed" | "order_cancelled",
): Promise<boolean> {
  const [row] = await tx
    .select({ id: stockLedger.id })
    .from(stockLedger)
    .where(
      and(eq(stockLedger.reference, orderId), eq(stockLedger.reason, reason)),
    )
    .limit(1);
  return Boolean(row);
}

export type StockOutcome = {
  moved: boolean;
  lines: number;
  units: number;
  /** Variants that went negative or would have. Worth telling the admin. */
  oversold: string[];
};

/**
 * Takes stock for an order. Safe to call repeatedly.
 *
 * Oversell is recorded rather than blocked. Refusing to mark a real, paid order
 * as paid because the count says zero would be the system overruling somebody
 * who is holding the product in their hand, and the count is the thing more
 * likely to be wrong. The ledger keeps the truth and the admin gets told.
 */
export async function takeStockForOrder(
  tx: Executor,
  orderId: string,
  reference: string,
): Promise<StockOutcome> {
  if (await alreadyMoved(tx, orderId, "order_placed")) {
    return { moved: false, lines: 0, units: 0, oversold: [] };
  }

  const lines = await resolveLines(tx, orderId);
  if (lines.length === 0) {
    return { moved: false, lines: 0, units: 0, oversold: [] };
  }

  const current = await tx
    .select({ id: variants.id, stockQty: variants.stockQty })
    .from(variants)
    .where(
      inArray(
        variants.id,
        lines.map((line) => line.variantId),
      ),
    );
  const stockById = new Map(
    (current as Array<{ id: string; stockQty: number }>).map((row) => [
      row.id,
      row.stockQty,
    ]),
  );

  const oversold: string[] = [];
  for (const line of lines) {
    if ((stockById.get(line.variantId) ?? 0) < line.quantity) {
      oversold.push(line.name);
    }
  }

  await tx.insert(stockLedger).values(
    lines.map((line) => ({
      variantId: line.variantId,
      delta: -line.quantity,
      reason: "order_placed" as const,
      reference: orderId,
      note: `Sold on ${reference}`,
    })),
  );

  for (const line of lines) {
    await tx
      .update(variants)
      .set({
        // `greatest(...,0)` keeps the cached quantity sane even when the ledger
        // records an oversell. The ledger still shows the true negative delta.
        stockQty: sql`greatest(${variants.stockQty} - ${line.quantity}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(variants.id, line.variantId));
  }

  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  log.info("stock taken for order", { orderId, reference, lines: lines.length, units, oversold: oversold.length });
  return { moved: true, lines: lines.length, units, oversold };
}

/**
 * Puts stock back for a cancelled or refunded order. Safe to call repeatedly.
 *
 * Returns early when the order never took stock in the first place, which is the
 * common case: most cancellations happen while an order is still pending, and
 * putting back what was never taken would invent inventory.
 */
export async function returnStockForOrder(
  tx: Executor,
  orderId: string,
  reference: string,
): Promise<StockOutcome> {
  const took = await alreadyMoved(tx, orderId, "order_placed");
  if (!took) return { moved: false, lines: 0, units: 0, oversold: [] };

  if (await alreadyMoved(tx, orderId, "order_cancelled")) {
    return { moved: false, lines: 0, units: 0, oversold: [] };
  }

  const lines = await resolveLines(tx, orderId);
  if (lines.length === 0) {
    return { moved: false, lines: 0, units: 0, oversold: [] };
  }

  await tx.insert(stockLedger).values(
    lines.map((line) => ({
      variantId: line.variantId,
      delta: line.quantity,
      reason: "order_cancelled" as const,
      reference: orderId,
      note: `Returned from ${reference}`,
    })),
  );

  for (const line of lines) {
    await tx
      .update(variants)
      .set({
        stockQty: sql`${variants.stockQty} + ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(variants.id, line.variantId));
  }

  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  log.info("stock returned for order", { orderId, reference, lines: lines.length, units });
  return { moved: true, lines: lines.length, units, oversold: [] };
}

