/**
 * Ghana cedi money helpers.
 *
 * Rule (ARCHITECTURE.md §3): prices are stored as integer MINOR units (pesewas).
 * 7000 === GH₵70.00. Never a float. Paystack charges in pesewas too, so the
 * stored value is what we hand to the payment provider unchanged.
 */

export const CURRENCY = "GHS" as const;

const formatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: CURRENCY,
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
});

/** 7000 → "GH₵70.00" */
export function formatPrice(minorUnits: number): string {
  return formatter.format(minorUnits / 100);
}

/** 7000 → "70". For large display prices where the decimals are noise. */
export function formatPriceShort(minorUnits: number): string {
  const major = minorUnits / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

/** Cedis → pesewas, for seeding data. `cedis(70)` === 7000. */
export function cedis(amount: number): number {
  return Math.round(amount * 100);
}

/** Whole-percent discount, or null when there is nothing to shout about. */
export function discountPercent(
  priceMinor: number,
  compareAtMinor?: number,
): number | null {
  if (!compareAtMinor || compareAtMinor <= priceMinor) return null;
  return Math.round(((compareAtMinor - priceMinor) / compareAtMinor) * 100);
}
