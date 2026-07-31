/**
 * Catalogue types and the repository seam.
 *
 * Rule (ARCHITECTURE.md §3): pages call THIS module, never a data source
 * directly. v1 is backed by the static seed in `catalog.data.ts`; swapping to
 * Postgres means writing a new adapter here and touching zero page components.
 * Every reader is async today so that swap stays a non-event.
 */

import { PRODUCTS } from "./catalog.data";

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
   * selector — "Lemon Blast 350ml / 500ml / 1L" is one product, not three.
   */
  group?: string;
  /** Raw material / bulk trade SKU. Hidden from the consumer shop. */
  wholesale?: boolean;
  /** Pesewas. See lib/money.ts — never a float. */
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
  /** Cheapest variant — the one the card shows and links to. */
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

/* -------------------------------------------------------------------------- */
/* Readers — the whole public surface of the data layer.                       */
/* -------------------------------------------------------------------------- */

export async function listProducts(options?: {
  category?: CategorySlug;
  line?: ProductLine;
  limit?: number;
  /** Bulk trade SKUs are off the consumer shelf unless explicitly asked for. */
  includeWholesale?: boolean;
}): Promise<Product[]> {
  let results = PRODUCTS.slice();

  if (!options?.includeWholesale) {
    results = results.filter((p) => !p.wholesale);
  }
  if (options?.category) {
    results = results.filter((p) => p.category === options.category);
  }
  if (options?.line) {
    results = results.filter((p) => p.line === options.line);
  }
  // Flagship first, then cheapest-first so entry-price products lead each grid.
  results.sort((a, b) => {
    if (a.line !== b.line) return a.line === "flagship" ? -1 : 1;
    return a.priceMinor - b.priceMinor;
  });

  return options?.limit ? results.slice(0, options.limit) : results;
}

export async function getProduct(slug: string): Promise<Product | null> {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

/**
 * The consumer shelf: size families collapsed to one entry each, led by the
 * cheapest variant so the entry price is what a first-time buyer sees.
 */
export async function listShelf(options?: {
  category?: CategorySlug;
  line?: ProductLine;
  limit?: number;
}): Promise<ProductGroup[]> {
  const products = await listProducts({
    category: options?.category,
    line: options?.line,
  });

  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.group ?? product.slug;
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }

  const shelf = [...groups.entries()].map(([key, variants]) => {
    const ordered = variants
      .slice()
      .sort((a, b) => a.priceMinor - b.priceMinor);
    const lead = ordered[0];
    return {
      key,
      name: (variants.length > 1 && lead.baseName) || lead.name,
      category: lead.category,
      line: lead.line,
      lead,
      variants: ordered,
    };
  });

  shelf.sort((a, b) => {
    if (a.line !== b.line) return a.line === "flagship" ? -1 : 1;
    return a.lead.priceMinor - b.lead.priceMinor;
  });

  return options?.limit ? shelf.slice(0, options.limit) : shelf;
}

/** Every variant in a product's size family, cheapest first. */
export async function getVariants(product: Product): Promise<Product[]> {
  if (!product.group) return [product];
  return PRODUCTS.filter((p) => p.group === product.group).sort(
    (a, b) => a.priceMinor - b.priceMinor,
  );
}

/** Bulk trade SKUs, for the wholesale page. */
export async function listWholesale(): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.wholesale);
}

/**
 * Every distinct botanical the range actually contains, most-used first.
 *
 * Drawn from the imported ingredient lists — so the hero ticker is a statement
 * of fact about the catalogue, not decorative word salad. Water and the base
 * soap crumble are dropped: they appear in nearly everything and say nothing.
 */
const INGREDIENT_NOISE = /^(water|fragrance|african black soap( crumble)?)$/i;

export async function listIngredients(limit = 18): Promise<string[]> {
  const counts = new Map<string, number>();

  for (const product of PRODUCTS) {
    if (!product.ingredients) continue;
    for (const raw of product.ingredients.split(",")) {
      const name = raw.trim().replace(/\s+/g, " ");
      if (!name || INGREDIENT_NOISE.test(name)) continue;
      // Title-case so "lavender" and "Lavender" are one entry.
      const key = name
        .toLowerCase()
        .replace(/\b\p{L}/gu, (c) => c.toUpperCase());
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name);
}

export async function listCategories(): Promise<
  Array<Category & { count: number }>
> {
  const shelf = await listShelf();
  return CATEGORIES.map((category) => ({
    ...category,
    count: shelf.filter((g) => g.category === category.slug).length,
  }));
}

export function getCategory(slug: string): Category | null {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export async function countProducts(): Promise<number> {
  return PRODUCTS.filter((p) => !p.wholesale).length;
}

/** Cheapest and dearest shelf SKU, for the "from GH₵x" line on the home page. */
export async function priceRange(): Promise<{ min: number; max: number }> {
  const prices = PRODUCTS.filter((p) => !p.wholesale).map((p) => p.priceMinor);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
