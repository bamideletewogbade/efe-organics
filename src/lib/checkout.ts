/**
 * Checkout model.
 *
 * TWO THINGS ARE DELIBERATELY NOT INVENTED HERE:
 *
 * 1. **Delivery rates.** Nobody has told us what Efe charges to deliver to
 *    Kumasi (docs/OPEN-QUESTIONS.md #4). Rather than make a number up, which
 *    would be quoting a customer a price the business never agreed to, regions
 *    are collected and delivery is quoted on confirmation. `feeMinor: null`
 *    means "we will tell you", not "free".
 *
 * 2. **Payment capture.** Paystack is the intended provider (MoMo + card) but no
 *    keys exist. `capabilities.hasPaystack` gates it. Until then an order is
 *    RECORDED and handed to the customer as a reference plus a WhatsApp/email
 *    handoff. Nothing is charged, and the UI says so.
 *
 * The order reference is generated client-side purely so the customer has
 * something to quote. It is not an identity: the server will mint the real one
 * when orders are persisted.
 */

import type { Product } from "./catalog.types";

export const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North",
  "Outside Ghana",
] as const;

export type Region = (typeof REGIONS)[number];

export type DeliveryDetails = {
  name: string;
  email: string;
  phone: string;
  region: Region;
  town: string;
  address: string;
  notes?: string;
};

export type OrderLine = {
  slug: string;
  name: string;
  qty: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type DraftOrder = {
  reference: string;
  placedAt: string;
  lines: OrderLine[];
  subtotalMinor: number;
  /** null = quoted on confirmation. Never 0 as a stand-in. */
  deliveryFeeMinor: number | null;
  delivery: DeliveryDetails;
};

/**
 * Builds order lines from the cart, re-reading every price from the catalogue.
 *
 * This is the same rule as the cart: the client never states a price. When this
 * moves server-side the function is unchanged, it already treats the incoming
 * lines as nothing but slugs and quantities.
 */
export function buildOrderLines(
  cart: Array<{ slug: string; qty: number }>,
  catalogue: Record<string, Product>,
): OrderLine[] {
  return cart
    .map((line) => {
      const product = catalogue[line.slug];
      if (!product) return null;
      return {
        slug: product.slug,
        name: product.name,
        qty: line.qty,
        unitPriceMinor: product.priceMinor,
        lineTotalMinor: product.priceMinor * line.qty,
      };
    })
    .filter((line): line is OrderLine => line !== null);
}

export function subtotalOf(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
}

/**
 * Human-quotable reference: EFE-<base36 time>-<4 random>. Short enough to read
 * over the phone, unique enough for the volume this shop will see.
 */
export function makeReference(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const noise = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `EFE-${stamp}-${noise}`;
}

export function isCompleteDelivery(
  details: Partial<DeliveryDetails>,
): details is DeliveryDetails {
  return Boolean(
    details.name?.trim() &&
      details.email?.trim() &&
      details.phone?.trim() &&
      details.region &&
      details.town?.trim() &&
      details.address?.trim(),
  );
}
