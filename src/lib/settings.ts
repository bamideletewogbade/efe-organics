import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { deliveryRates, settings } from "@/db/schema";

/**
 * Shop settings and delivery rates.
 *
 * WHY THERE ARE DEFAULTS IN CODE AT ALL
 *
 * The shop has to render before anyone has opened the settings screen, and it
 * has to render with no database at all. So every setting has a default here,
 * and the database only ever overrides. That means a fresh deployment is a
 * working shop rather than a stack of empty strings.
 *
 * The defaults are deliberately conservative: no announcement, no delivery
 * rates. Nothing that would put a number in front of a customer that the
 * business has not agreed to.
 */

export type Announcement = {
  text: string;
  href: string;
  active: boolean;
};

export type ShopSettings = {
  /** Where "message us" links go. Digits only, international format. */
  whatsappNumber: string;
  /** Where order handoffs are emailed. */
  orderEmail: string;
  /** Applied to new variants that do not set their own. */
  lowStockDefault: number;
  /** The strip above the header. Off by default. */
  announcement: Announcement;
  /**
   * VAT and levies.
   *
   * OFF BY DEFAULT, AND THAT IS THE POINT.
   *
   * Nobody has confirmed whether Efe is VAT registered. Charging tax that is not
   * owed overcharges every customer; not charging tax that is owed leaves the
   * business carrying it out of margin. Neither is a guess worth making, so the
   * shop charges nothing until somebody sets this deliberately.
   *
   * The rate is in basis points because 12.5% and 2.5% levies do not survive
   * being stored as a float. Ghana's standard VAT plus NHIL, GETFund and the
   * COVID levy is commonly handled as a single effective rate, which is a
   * question for Efe's accountant, not for this file.
   */
  tax: {
    enabled: boolean;
    /** Basis points. 1500 = 15.0%. */
    rateBp: number;
    /** Shown next to the line on an invoice, e.g. "VAT + levies". */
    label: string;
    /** True when displayed prices already contain the tax. */
    inclusive: boolean;
  };
};

export const SETTING_DEFAULTS: ShopSettings = {
  whatsappNumber: "",
  orderEmail: "hello@efeorganics.com",
  lowStockDefault: 5,
  announcement: { text: "", href: "/shop", active: false },
  tax: { enabled: false, rateBp: 0, label: "VAT", inclusive: false },
};

/**
 * Works out the tax on an amount.
 *
 * Returns zero and a null rate when tax is off, which is what gets stored on the
 * order. A null `taxRateBp` on an order means "no tax was charged", which is a
 * different and more useful fact than a stored zero rate.
 */
export async function quoteTax(
  baseMinor: number,
): Promise<{ taxMinor: number; rateBp: number | null }> {
  const shop = await getShopSettings();
  const tax = shop.tax ?? SETTING_DEFAULTS.tax;

  if (!tax.enabled || tax.rateBp <= 0 || baseMinor <= 0) {
    return { taxMinor: 0, rateBp: null };
  }

  if (tax.inclusive) {
    // The price already contains the tax, so back it out rather than adding to
    // it. Getting this backwards is the classic way to overcharge by the rate.
    const taxMinor = Math.round(
      baseMinor - baseMinor / (1 + tax.rateBp / 10000),
    );
    return { taxMinor, rateBp: tax.rateBp };
  }

  return {
    taxMinor: Math.round((baseMinor * tax.rateBp) / 10000),
    rateBp: tax.rateBp,
  };
}

/**
 * Reads every setting, merged over the defaults.
 *
 * One query for the whole table rather than a query per key. There are a dozen
 * settings and they are read on most pages; a per-key lookup would turn the
 * header into a dozen round trips.
 */
export async function getShopSettings(): Promise<ShopSettings> {
  const db = getDb();
  if (!db) return SETTING_DEFAULTS;

  try {
    const rows = await db.select().from(settings);
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { ...SETTING_DEFAULTS, ...stored } as ShopSettings;
  } catch {
    // A missing table (migrations not run) must not take the shop down.
    return SETTING_DEFAULTS;
  }
}

export async function setSetting<K extends keyof ShopSettings>(
  key: K,
  value: ShopSettings[K],
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

/* -------------------------------------------------------------------------- */
/* Delivery                                                                   */
/* -------------------------------------------------------------------------- */

export type DeliveryQuote =
  | { kind: "quoted"; feeMinor: number; etaLabel: string | null }
  | { kind: "free"; feeMinor: 0; etaLabel: string | null; reason: string }
  | { kind: "unquoted" };

/**
 * What delivery costs to a region for a given basket.
 *
 * Returns `unquoted` when the region has no rate, which the checkout renders as
 * "we will confirm this with you". That is the honest answer and it is also the
 * current answer for most of Ghana, so it is a first-class result rather than an
 * error case.
 */
export async function quoteDelivery(
  region: string,
  subtotalMinor: number,
): Promise<DeliveryQuote> {
  const db = getDb();
  if (!db) return { kind: "unquoted" };

  try {
    const [rate] = await db
      .select()
      .from(deliveryRates)
      .where(eq(deliveryRates.region, region));

    if (!rate || !rate.active) return { kind: "unquoted" };

    if (rate.freeOverMinor !== null && subtotalMinor >= rate.freeOverMinor) {
      return {
        kind: "free",
        feeMinor: 0,
        etaLabel: rate.etaLabel,
        reason: "Free delivery on this basket",
      };
    }

    return { kind: "quoted", feeMinor: rate.feeMinor, etaLabel: rate.etaLabel };
  } catch {
    return { kind: "unquoted" };
  }
}

export async function listDeliveryRates() {
  const db = getDb();
  if (!db) return [];
  try {
    return await db.select().from(deliveryRates).orderBy(deliveryRates.region);
  } catch {
    return [];
  }
}
