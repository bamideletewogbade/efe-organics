/**
 * Seeds the database from the committed static catalogue.
 *
 *   npm run db:seed
 *
 * THE INTERESTING PART is the reshape. The static file is 42 flat rows where a
 * "product" is really a SKU, with a `group` string tying sizes together. The
 * schema separates product from variant. So this script inverts that: each
 * group becomes ONE product, and its members become variants carrying price,
 * size and stock.
 *
 * 42 rows in → 28 products with 42 variants out. That is the same collapse the
 * storefront was faking in the UI, now done properly in the data, which is what
 * makes stock, discounts and reporting per-size possible at all.
 *
 * Idempotent: re-running updates rather than duplicating, keyed on slug. Safe to
 * run against a database that already has orders.
 *
 * STOCK IS SEEDED AT ZERO ON PURPOSE. Nobody has told us how many bars exist,
 * and inventing quantities would put fiction in front of customers. The admin
 * sets real numbers; until then `trackStock` is off so nothing shows as sold out.
 */

import { eq } from "drizzle-orm";

import { CATEGORIES } from "@/lib/catalog";
import { PRODUCTS } from "@/lib/catalog.data";
import { logger } from "@/lib/logger";
import { requireDb } from "./client";
import {
  categories,
  customers,
  orderItems,
  orders,
  productImages,
  products,
  stockLedger,
  variants,
} from "./schema";

const log = logger.child({ script: "seed" });

/** "Lemon Blast Black Soap Bath 500ml" → "Lemon Blast Black Soap Bath" */
function stripSize(name: string): string {
  return name
    .replace(/\s*\d+\s*(ml|l|ltr|litre|g|kg|kgs)\b\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function main() {
  const db = requireDb();

  /* ---- categories ---- */
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const [row] = await db
      .insert(categories)
      .values({
        slug: category.slug,
        name: category.name,
        blurb: category.blurb,
        position: index,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: category.name, blurb: category.blurb, position: index },
      })
      .returning({ id: categories.id });
    categoryIds.set(category.slug, row.id);
  }
  log.info("categories seeded", { count: categoryIds.size });

  /* ---- group the flat SKUs into products ---- */
  const groups = new Map<string, typeof PRODUCTS>();
  for (const sku of PRODUCTS) {
    // Products with no `group` are their own single-variant family.
    const key = sku.group ?? sku.slug;
    const bucket = groups.get(key) ?? [];
    bucket.push(sku);
    groups.set(key, bucket);
  }

  let variantCount = 0;
  let imageCount = 0;

  for (const [key, skus] of groups) {
    // Cheapest first, so variant[0] is the entry price and the family's lead.
    const members = [...skus].sort((a, b) => a.priceMinor - b.priceMinor);
    const lead = members[0];

    const productSlug = skus.length > 1 ? key : lead.slug;
    const productName =
      skus.length > 1 ? stripSize(lead.baseName ?? lead.name) : lead.name;

    const [product] = await db
      .insert(products)
      .values({
        slug: productSlug,
        name: productName,
        categoryId: categoryIds.get(lead.category) ?? null,
        line: lead.line,
        // Imported SKUs are real and on sale. They go in active, not draft.
        status: "active",
        blurb: lead.blurb ?? null,
        ingredients: lead.ingredients ?? null,
        howToUse: lead.howToUse ?? null,
        tags: lead.tags ?? [],
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: productName,
          categoryId: categoryIds.get(lead.category) ?? null,
          line: lead.line,
          blurb: lead.blurb ?? null,
          ingredients: lead.ingredients ?? null,
          howToUse: lead.howToUse ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: products.id });

    for (const [position, sku] of members.entries()) {
      await db
        .insert(variants)
        .values({
          productId: product.id,
          slug: sku.slug,
          sizeLabel: sku.sizeMl
            ? sku.sizeMl >= 1000
              ? `${sku.sizeMl / 1000}L`
              : `${sku.sizeMl}ml`
            : sku.sizeG
              ? `${sku.sizeG}g`
              : null,
          sizeMl: sku.sizeMl ?? null,
          sizeG: sku.sizeG ?? null,
          priceMinor: sku.priceMinor,
          compareAtMinor: sku.compareAtMinor ?? null,
          channel: sku.wholesale ? "trade" : "retail",
          // See the note at the top: no invented quantities.
          stockQty: 0,
          trackStock: false,
          position,
        })
        .onConflictDoUpdate({
          target: variants.slug,
          set: {
            productId: product.id,
            priceMinor: sku.priceMinor,
            compareAtMinor: sku.compareAtMinor ?? null,
            channel: sku.wholesale ? "trade" : "retail",
            position,
            updatedAt: new Date(),
          },
        });
      variantCount++;

      for (const [imageIndex, url] of (sku.images ?? []).entries()) {
        // No natural key on images, so clear this product's set once and
        // re-insert, cheaper and more correct than diffing URLs.
        if (imageIndex === 0 && position === 0) {
          await db
            .delete(productImages)
            .where(eq(productImages.productId, product.id));
        }
        await db.insert(productImages).values({
          productId: product.id,
          url,
          alt: sku.name,
          position: imageIndex,
        });
        imageCount++;
      }
    }
  }

  log.info("catalogue seeded", {
    products: groups.size,
    variants: variantCount,
    images: imageCount,
  });

  /* ---- sample orders & customers for end-to-end testing ---- */
  const sampleCustomer = {
    email: "abena.owusu@gmail.com",
    name: "Abena Owusu",
    phone: "0244123456",
  };

  const [customerRow] = await db
    .insert(customers)
    .values(sampleCustomer)
    .onConflictDoUpdate({
      target: customers.email,
      set: { name: sampleCustomer.name, phone: sampleCustomer.phone },
    })
    .returning({ id: customers.id });

  // Get first 2 variants for line items
  const allVariants = await db
    .select({
      id: variants.id,
      priceMinor: variants.priceMinor,
      sizeLabel: variants.sizeLabel,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .limit(2);

  if (allVariants.length > 0) {
    const v1 = allVariants[0];
    const v2 = allVariants[1] ?? v1;

    const seedOrders = [
      {
        reference: "EFE-8K92-PSTK",
        status: "paid" as const,
        paymentStatus: "paid" as const,
        subtotalMinor: v1.priceMinor + v2.priceMinor,
        deliveryMinor: 2500, // GH₵25.00 East Legon
        totalMinor: v1.priceMinor + v2.priceMinor + 2500,
        deliveryName: "Abena Owusu",
        deliveryPhone: "0244123456",
        deliveryEmail: "abena.owusu@gmail.com",
        deliveryRegion: "Greater Accra",
        deliveryTown: "East Legon",
        deliveryAddress: "Block B, Boundary Road",
        momoReference: "MTN-9948271048",
        paystackReference: "pstk_live_9948271",
        customerNote: "Please leave package with security gate if not home.",
      },
      {
        reference: "EFE-3M14-MOMO",
        status: "confirmed" as const,
        paymentStatus: "unpaid" as const,
        subtotalMinor: v1.priceMinor * 2,
        deliveryMinor: 3000, // GH₵30.00 Spintex
        totalMinor: v1.priceMinor * 2 + 3000,
        deliveryName: "Kofi Mensah",
        deliveryPhone: "0551987654",
        deliveryEmail: "kofi.mensah@yahoo.com",
        deliveryRegion: "Greater Accra",
        deliveryTown: "Spintex",
        deliveryAddress: "Spintex Coastal Estate",
        momoReference: "TELECEL-88234",
        customerNote: "Paid via Telecel Cash.",
      },
    ];

    for (const ord of seedOrders) {
      const [orderRow] = await db
        .insert(orders)
        .values({
          ...ord,
          customerId: customerRow.id,
        })
        .onConflictDoUpdate({
          target: orders.reference,
          set: { status: ord.status, paymentStatus: ord.paymentStatus },
        })
        .returning({ id: orders.id });

      // Insert line items
      await db
        .insert(orderItems)
        .values([
          {
            orderId: orderRow.id,
            variantId: v1.id,
            nameSnapshot: v1.productName,
            sizeSnapshot: v1.sizeLabel,
            slugSnapshot: v1.productSlug,
            unitPriceMinor: v1.priceMinor,
            quantity: 1,
            lineTotalMinor: v1.priceMinor,
          },
          {
            orderId: orderRow.id,
            variantId: v2.id,
            nameSnapshot: v2.productName,
            sizeSnapshot: v2.sizeLabel,
            slugSnapshot: v2.productSlug,
            unitPriceMinor: v2.priceMinor,
            quantity: 1,
            lineTotalMinor: v2.priceMinor,
          },
        ]);
    }
    log.info("sample orders seeded for end-to-end testing", {
      count: seedOrders.length,
    });
  }
}

main()
  .then(() => {
    log.info("seed complete");
    process.exit(0);
  })
  .catch((error) => {
    log.error("seed failed", { error });
    process.exit(1);
  });

