/*
  SERVER ONLY, AND ENFORCED RATHER THAN ASSUMED.

  Importing this from a client component pulls `db/client`, and with it the
  whole `postgres` driver, into the browser bundle. That failed the build with
  "Module not found: Can't resolve 'fs'" the first time it happened, via a chain
  nobody would predict: CartDrawer is a client component, it imported
  `sizeLabel` from `lib/catalog`, and `lib/catalog` had just started importing
  this file.

  TypeScript cannot catch that. Nothing about the types is wrong, only the
  runtime boundary. This directive makes the same mistake fail immediately with
  a message that names the real problem, instead of one about `fs`.
*/
import "server-only";

import { cache } from "react";
import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { categories, productImages, products, variants } from "@/db/schema";
import type { CategorySlug, Product, ProductLine } from "@/lib/catalog";
import { logger } from "@/lib/logger";

/**
 * The database adapter for the catalogue.
 *
 * WHAT THIS FIXES
 *
 * The admin could edit a price, a description, a picture or a product's status,
 * save it, see it saved, and the shop would keep showing the old one forever,
 * because the storefront read a committed TypeScript file. The whole back office
 * was a control panel wired to nothing. Every other gap in this project was
 * smaller than that one.
 *
 * THE SHAPE MISMATCH, AND WHY IT IS HANDLED HERE
 *
 * The static catalogue treats every SIZE as a product: "Lemon Blast 350ml" and
 * "Lemon Blast 1L" are two entries joined by a `group` key. The database models
 * it correctly, as one product with two variants, because price and stock belong
 * to a size and not to a name.
 *
 * The database is right and the storefront's shape is entrenched across a dozen
 * components. So the flattening happens here, in the adapter, exactly where the
 * original design note said the swap would go. One variant becomes one
 * `Product`, and `group` carries the parent's slug so the size selector keeps
 * working unchanged.
 *
 * CACHED PER REQUEST, NOT ACROSS THEM
 *
 * `cache()` means one page rendering six components that each call the catalogue
 * issues one query, not six. It does NOT persist between requests, which is
 * deliberate: a price edited in the admin should be live on the next page load,
 * and a stale-for-an-hour cache is exactly the "I changed it and nothing
 * happened" complaint this work exists to end.
 */

const log = logger.child({ module: "catalog-db" });

/** Category slugs live in code; the database stores them as rows. */
const KNOWN_CATEGORIES = new Set<string>([
  "black-soap",
  "hair-care",
  "body-care",
  "lotions-butters",
  "skincare",
  "oils",
]);

/**
 * Bulk SKUs are identified by their sales channel, not by a flag on the product.
 *
 * `channel` is on the VARIANT because it is a property of how a size is sold:
 * the same soap is retail in a 350ml bottle and wholesale by the quarter tonne.
 */
function isWholesale(channel: string): boolean {
  return channel !== "retail";
}

export const loadCatalogue = cache(async (): Promise<Product[] | null> => {
  const db = getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select({
        variantSlug: variants.slug,
        sizeLabel: variants.sizeLabel,
        sizeMl: variants.sizeMl,
        sizeG: variants.sizeG,
        priceMinor: variants.priceMinor,
        compareAtMinor: variants.compareAtMinor,
        stockQty: variants.stockQty,
        trackStock: variants.trackStock,
        allowBackorder: variants.allowBackorder,
        channel: variants.channel,
        variantPosition: variants.position,

        productId: products.id,
        productSlug: products.slug,
        productName: products.name,
        line: products.line,
        blurb: products.blurb,
        description: products.description,
        ingredients: products.ingredients,
        howToUse: products.howToUse,
        tags: products.tags,
        productPosition: products.position,

        categorySlug: categories.slug,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(
          isNull(variants.archivedAt),
          isNull(products.archivedAt),
          // Draft and archived products are invisible to shoppers. This is the
          // single line that makes the status dropdown in the admin mean
          // something.
          eq(products.status, "active"),
        ),
      )
      .orderBy(asc(products.position), asc(variants.position), asc(variants.priceMinor));

    if (rows.length === 0) {
      // An empty catalogue is almost always an unseeded database rather than a
      // shop with nothing to sell, and returning null falls back to the static
      // file instead of showing an empty shop.
      log.warn("catalogue query returned no rows, falling back to the static file");
      return null;
    }

    const imageRows = await db
      .select({
        productId: productImages.productId,
        variantId: productImages.variantId,
        url: productImages.url,
      })
      .from(productImages)
      .orderBy(asc(productImages.position));

    const imagesByProduct = new Map<string, string[]>();
    for (const image of imageRows) {
      const list = imagesByProduct.get(image.productId) ?? [];
      list.push(image.url);
      imagesByProduct.set(image.productId, list);
    }

    /* ---- how many sizes does each product have? ---- */
    const sizeCount = new Map<string, number>();
    for (const row of rows) {
      sizeCount.set(row.productSlug, (sizeCount.get(row.productSlug) ?? 0) + 1);
    }

    return rows.map((row): Product => {
      const many = (sizeCount.get(row.productSlug) ?? 1) > 1;

      /*
        The display name carries the size only when there is more than one, so a
        one-size product does not read "Shea Butter 250g 250g" once the size
        selector adds its own label.
      */
      const name =
        many && row.sizeLabel
          ? `${row.productName} ${row.sizeLabel}`
          : row.productName;

      const category = (
        row.categorySlug && KNOWN_CATEGORIES.has(row.categorySlug)
          ? row.categorySlug
          : "black-soap"
      ) as CategorySlug;

      return {
        slug: row.variantSlug,
        name,
        baseName: row.productName,
        category,
        line: row.line as ProductLine,
        // Only set when there is a family to group, matching the static file's
        // convention. A stray group key on a single-size product makes the size
        // selector render one lonely option.
        group: many ? row.productSlug : undefined,
        wholesale: isWholesale(row.channel) || undefined,
        priceMinor: row.priceMinor,
        compareAtMinor: row.compareAtMinor ?? undefined,
        sizeMl: row.sizeMl ?? undefined,
        sizeG: row.sizeG ?? undefined,
        blurb: row.description ?? row.blurb ?? undefined,
        ingredients: row.ingredients ?? undefined,
        howToUse: row.howToUse ?? undefined,
        tags: row.tags ?? undefined,
        images: imagesByProduct.get(row.productId) ?? [],
        /*
          Stock is only a constraint when somebody has asked for it to be. With
          tracking off, which is how the imported catalogue arrived, everything
          is available, because "we do not count this" and "we have none" are
          opposite facts and defaulting to the second would close the shop.
        */
        inStock:
          !row.trackStock || row.allowBackorder || row.stockQty > 0,
      };
    });
  } catch (error) {
    // A catalogue query failing must not take the shop down. The static file is
    // committed and correct enough to sell from.
    log.error("catalogue query failed, falling back to the static file", {
      error: String(error),
    });
    return null;
  }
});
