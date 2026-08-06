/**
 * Catalogue types and the repository seam.
 *
 * Rule (ARCHITECTURE.md §3): pages call THIS module, never a data source
 * directly. Every reader has always been async so that swapping the source
 * would be a non-event.
 *
 * THE SWAP HAS NOW HAPPENED, AND THE ASYNC PAID FOR ITSELF.
 *
 * Postgres is the source when `DATABASE_URL` is set. The committed static file
 * is the fallback. Not one page component changed.
 *
 * WHY THE STATIC FILE SURVIVES
 *
 * It is not dead code and it is not sentiment. It is what makes three things
 * true: the project still builds and demos with an empty `.env.local`, a
 * database outage degrades the shop to a slightly stale catalogue instead of a
 * white page, and an unseeded database shows the real range rather than an
 * empty shop. Deleting it would trade all of that for one fewer file.
 *
 * The fallback is deliberately quiet in normal use and loud in the logs: if the
 * shop is silently serving stale data, somebody needs to be able to find out.
 */

import { loadCatalogue } from "./catalog.db";
import { PRODUCTS } from "./catalog.data";

/*
  Types, category definitions and pure helpers moved to `catalog.types.ts` so
  client components can import them without dragging the Postgres driver into
  the browser bundle. Re-exported here so every existing server-side import
  keeps working unchanged.
*/
export {
  CATEGORIES,
  sizeLabel,
  type Category,
  type CategorySlug,
  type Product,
  type ProductGroup,
  type ProductLine,
} from "./catalog.types";

import { CATEGORIES } from "./catalog.types";
import type {
  Category,
  CategorySlug,
  Product,
  ProductGroup,
  ProductLine,
} from "./catalog.types";

/* -------------------------------------------------------------------------- */
/* The seam                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every reader goes through here. Nothing else touches a source.
 *
 * One function to change when the fallback is eventually retired, and one place
 * to look when somebody asks "is this page showing the database or the file".
 */
async function source(): Promise<Product[]> {
  return (await loadCatalogue()) ?? PRODUCTS.slice();
}

/* -------------------------------------------------------------------------- */
/* Readers. The whole public surface of the data layer.                       */
/* -------------------------------------------------------------------------- */

export async function listProducts(options?: {
  category?: CategorySlug;
  line?: ProductLine;
  limit?: number;
  /** Bulk trade SKUs are off the consumer shelf unless explicitly asked for. */
  includeWholesale?: boolean;
}): Promise<Product[]> {
  let results = await source();

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
  return (await source()).find((p) => p.slug === slug) ?? null;
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
  return (await source()).filter((p) => p.group === product.group).sort(
    (a, b) => a.priceMinor - b.priceMinor,
  );
}

/** Bulk trade SKUs, for the wholesale page. */
export async function listWholesale(): Promise<Product[]> {
  return (await source()).filter((p) => p.wholesale);
}

/**
 * Every distinct botanical the range actually contains, most-used first.
 *
 * Drawn from the imported ingredient lists, so the hero ticker is a statement
 * of fact about the catalogue, not decorative word salad. Water and the base
 * soap crumble are dropped: they appear in nearly everything and say nothing.
 */
const INGREDIENT_NOISE = /^(water|fragrance|african black soap( crumble)?)$/i;

export async function listIngredients(limit = 18): Promise<string[]> {
  const counts = new Map<string, number>();

  for (const product of await source()) {
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
  return (await source()).filter((p) => !p.wholesale).length;
}

/** Cheapest and dearest shelf SKU, for the "from GH₵x" line on the home page. */
export async function priceRange(): Promise<{ min: number; max: number }> {
  const prices = (await source())
    .filter((p) => !p.wholesale)
    .map((p) => p.priceMinor);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
