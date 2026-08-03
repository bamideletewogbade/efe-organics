import { and, eq, isNull, or, sql } from "drizzle-orm";

import type { Executor } from "@/db/client";
import {
  categories,
  discounts,
  products,
  variants,
} from "@/db/schema";
import { logger } from "@/lib/logger";

/**
 * Applying discounts to a basket.
 *
 * WHAT WAS WRONG
 *
 * The admin could create a discount, switch it on, and show it as Live. Nothing
 * anywhere ever applied one. Alberta could have built "Harmattan 20% off",
 * announced it, and watched every customer pay full price while the screen told
 * her it was running. A feature that reports success and does nothing is worse
 * than a missing feature, because nobody goes looking for the bug.
 *
 * ONE DISCOUNT, THE BEST ONE. NOT A STACK.
 *
 * Stacking needs a policy: does 20% off then GH₵10 off differ from the reverse,
 * can a code combine with an automatic sale, what stops two rules compounding to
 * free. Nobody has set that policy, so this picks the single largest saving and
 * ignores the rest. That is predictable, explainable to a customer, and cannot
 * be gamed into a zero-cedi order. Stacking can be added when somebody decides
 * the rules; guessing them here would be inventing shop policy.
 *
 * EVALUATED SERVER-SIDE, ALWAYS.
 *
 * The browser never says what the discount is worth, the same rule the basket
 * and the order endpoint already follow. A discount computed in the client is a
 * discount a customer can edit.
 *
 * SCOPES AND THE STATIC CATALOGUE
 *
 * A scoped discount points at a product, variant or category by database id,
 * while a basket line is a catalogue slug, because the shop still reads the
 * static file. So targets are resolved down to the set of variant slugs they
 * cover and matched against the line slugs. When the repository swap lands and
 * lines carry real ids, the resolution below collapses to a direct comparison.
 */

const log = logger.child({ module: "discounts" });

export type BasketLine = {
  slug: string;
  quantity: number;
  lineTotalMinor: number;
};

export type AppliedDiscount = {
  discountId: string;
  name: string;
  /** What the customer typed, when a code was used. */
  code: string | null;
  amountMinor: number;
  /** Short human label for the basket: "20% off" or "GH₵10 off". */
  label: string;
};

type DiscountRow = typeof discounts.$inferSelect;

/** Every variant slug a scoped discount covers. */
async function slugsForTarget(
  tx: Executor,
  scope: DiscountRow["scope"],
  targetId: string | null,
): Promise<Set<string> | null> {
  if (scope === "order") return null;
  if (!targetId) return new Set();

  if (scope === "variant") {
    const rows = await tx
      .select({ slug: variants.slug })
      .from(variants)
      .where(eq(variants.id, targetId));
    return new Set(rows.map((row) => row.slug));
  }

  if (scope === "product") {
    const rows = await tx
      .select({ slug: variants.slug })
      .from(variants)
      .where(eq(variants.productId, targetId));
    return new Set(rows.map((row) => row.slug));
  }

  // category
  const rows = await tx
    .select({ slug: variants.slug })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(categories.id, targetId));
  return new Set(rows.map((row) => row.slug));
}

/** What a single rule is worth against this basket, or 0 when it does not apply. */
function valueOf(
  discount: DiscountRow,
  eligibleMinor: number,
): number {
  if (eligibleMinor <= 0) return 0;
  if (discount.kind === "percentage") {
    return Math.round((eligibleMinor * Math.min(100, discount.value)) / 100);
  }
  // Fixed amount, never more than the thing it is discounting.
  return Math.min(discount.value, eligibleMinor);
}

function labelFor(discount: DiscountRow): string {
  return discount.kind === "percentage"
    ? `${discount.value}% off`
    : `GH₵${(discount.value / 100).toFixed(2)} off`;
}

/**
 * Finds the best discount for a basket.
 *
 * Returns null when nothing applies, which is the normal case and not an error.
 */
export async function resolveDiscount(
  tx: Executor,
  {
    subtotalMinor,
    lines,
    code,
  }: { subtotalMinor: number; lines: BasketLine[]; code?: string | null },
): Promise<AppliedDiscount | null> {
  const now = new Date();
  const entered = (code ?? "").trim().toUpperCase() || null;

  /*
    Automatic discounts (no code) always compete. A coded discount only enters
    the running when that exact code was typed, so an unused code cannot leak
    into every basket.
  */
  const candidates = await tx
    .select()
    .from(discounts)
    .where(
      and(
        eq(discounts.active, true),
        entered
          ? or(isNull(discounts.code), eq(discounts.code, entered))
          : isNull(discounts.code),
      ),
    );

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  let best: AppliedDiscount | null = null;

  for (const discount of candidates as DiscountRow[]) {
    if (discount.startsAt && discount.startsAt > now) continue;
    if (discount.endsAt && discount.endsAt < now) continue;
    if (
      discount.usageLimit !== null &&
      discount.usageCount >= discount.usageLimit
    ) {
      continue;
    }
    if (
      discount.minSubtotalMinor !== null &&
      subtotalMinor < discount.minSubtotalMinor
    ) {
      continue;
    }
    if (discount.minQuantity !== null && totalQuantity < discount.minQuantity) {
      continue;
    }

    const targetSlugs = await slugsForTarget(tx, discount.scope, discount.targetId);
    const eligibleMinor =
      targetSlugs === null
        ? subtotalMinor
        : lines
            .filter((line) => targetSlugs.has(line.slug))
            .reduce((sum, line) => sum + line.lineTotalMinor, 0);

    const amountMinor = Math.min(valueOf(discount, eligibleMinor), subtotalMinor);
    if (amountMinor <= 0) continue;

    if (!best || amountMinor > best.amountMinor) {
      best = {
        discountId: discount.id,
        name: discount.name,
        code: discount.code,
        amountMinor,
        label: labelFor(discount),
      };
    }
  }

  if (best) {
    log.info("discount applied", {
      discountId: best.discountId,
      amountMinor: best.amountMinor,
    });
  }
  return best;
}

/**
 * Records that a discount was used.
 *
 * Separate from resolution so that quoting a basket, which happens on every
 * checkout render, never burns through a usage limit. Only a committed order
 * calls this.
 */
export async function recordDiscountUse(
  tx: Executor,
  discountId: string,
): Promise<void> {
  await tx
    .update(discounts)
    .set({ usageCount: sql`${discounts.usageCount} + 1`, updatedAt: new Date() })
    .where(eq(discounts.id, discountId));
}

/** Active discounts a shopper could see advertised. Used by the storefront. */
export async function listPublicDiscounts(tx: Executor) {
  const now = new Date();
  const rows = await tx
    .select({
      name: discounts.name,
      kind: discounts.kind,
      value: discounts.value,
      code: discounts.code,
      minSubtotalMinor: discounts.minSubtotalMinor,
      startsAt: discounts.startsAt,
      endsAt: discounts.endsAt,
    })
    .from(discounts)
    .where(and(eq(discounts.active, true), isNull(discounts.code)));

  return rows.filter(
    (row) =>
      (!row.startsAt || row.startsAt <= now) &&
      (!row.endsAt || row.endsAt >= now),
  );
}
