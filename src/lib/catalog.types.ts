/**
 * Catalogue types and pure helpers. Safe in the browser.
 *
 * WHY THIS FILE EXISTS
 *
 * Five client components need `sizeLabel` and the `Product` type, and they used
 * to import them from `lib/catalog`. That was harmless while the catalogue was a
 * committed TypeScript file. The moment it started reading Postgres, importing
 * it from a client component pulled `db/client`, and therefore the entire
 * `postgres` driver, into the browser bundle, where `fs` does not exist and the
 * build fails with "Module not found: Can't resolve 'fs'".
 *
 * TypeScript could not catch it: nothing about the types is wrong, only the
 * runtime boundary. The compiler catching it at build time is the good outcome;
 * the bad one is a driver quietly shipped to shoppers.
 *
 * So the split is by RUNTIME, not by topic. Anything a browser may touch lives
 * here. Anything that reads a data source lives in `catalog.ts`, which is
 * server-only and says so.
 */

export const CATEGORIES = [
  {
    slug: "black-soap",
    name: "African Black Soap",
    blurb:
      "The flagship line. Authentic African Black Soap baths, gels and bars in over twenty natural varieties.",
  },
  {
    slug: "hair-care",
    name: "Hair Care",
    blurb:
      "Herbal shampoos, conditioners and hair foods that cleanse the scalp and support healthy growth.",
  },
  {
    slug: "body-care",
    name: "Body Care",
    blurb: "Gentle milks, gels and everyday washes for the whole body.",
  },
  {
    slug: "lotions-butters",
    name: "Lotions & Butters",
    blurb: "Shea-rich butters and glow lotions that seal in moisture.",
  },
  {
    slug: "skincare",
    name: "Skincare",
    blurb: "Targeted cleansers for acne, blemishes and an even complexion.",
  },
  {
    slug: "oils",
    name: "Oils",
    blurb: "Cold-pressed face, body and scalp oils.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type Category = (typeof CATEGORIES)[number];

/** Deck slide 3: three flagship lines carry the brand. Everything else supports. */
export type ProductLine = "flagship" | "supporting";

export type Product = {
  slug: string;
  name: string;
  /** Name with the size stripped, for variant-grouped display. */
  baseName?: string;
  category: CategorySlug;
  line: ProductLine;
  /**
   * Size family. Products sharing a group are one buying decision with a size
   * selector. "Lemon Blast 350ml / 500ml / 1L" is one product, not three.
   */
  group?: string;
  /** Raw material / bulk trade SKU. Hidden from the consumer shop. */
  wholesale?: boolean;
  /** Pesewas. See lib/money.ts, never a float. */
  priceMinor: number;
  /** Reseller RRP, when we undercut it. Drives the savings badge. */
  compareAtMinor?: number;
  sizeMl?: number;
  sizeG?: number;
  blurb?: string;
  ingredients?: string;
  howToUse?: string;
  tags?: string[];
  images: string[];
  inStock: boolean;
};

/** A size family collapsed into one shelf entry. */
export type ProductGroup = {
  key: string;
  name: string;
  category: CategorySlug;
  line: ProductLine;
  /** Cheapest variant. The one the card shows and links to. */
  lead: Product;
  variants: Product[];
};

/** Human size label: "350ml", "250g", "1L". */
export function sizeLabel(product: Product): string | null {
  if (product.sizeMl)
    return product.sizeMl >= 1000
      ? `${product.sizeMl / 1000}L`
      : `${product.sizeMl}ml`;
  if (product.sizeG)
    return product.sizeG >= 1000
      ? `${product.sizeG / 1000}kg`
      : `${product.sizeG}g`;
  return null;
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
