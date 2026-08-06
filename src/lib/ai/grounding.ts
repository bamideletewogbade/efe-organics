import { getDb } from "@/db/client";
import { listShelf, listProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { getShopSettings } from "@/lib/settings";

/**
 * Turning Efe's own data into facts a model may use.
 *
 * THIS IS THE HALF THAT MAKES THE AI SAFE.
 *
 * A model asked "write a description for the lemon black soap bath" will produce
 * something confident and plausible whether or not it knows anything about the
 * product. The output reads identically either way, which is precisely the
 * problem: fluent invention is indistinguishable from fluent recall.
 *
 * So nothing is answered from the model's own knowledge. Facts are assembled
 * here from the catalogue, the ingredient lists and the live settings, and the
 * client's system prompt says that anything outside them is unknown. If a fact
 * is not in the block below, the correct answer is "I do not know".
 *
 * WHY NO VECTOR DATABASE
 *
 * The default model carries a million tokens of context and the entire
 * catalogue is 42 variants with ingredient lists, which is a few thousand
 * tokens. Embeddings, a vector store and a retrieval step would add three
 * moving parts to solve a problem this shop does not have. Retrieval earns its
 * place when the corpus stops fitting; today it would be architecture for its
 * own sake.
 */

/** One product, as much as is known and nothing more. */
export async function productFacts(slug: string): Promise<string | null> {
  const products = await listProducts();
  const product = products.find((candidate) => candidate.slug === slug);
  if (!product) return null;

  const family = products.filter(
    (candidate) => product.group && candidate.group === product.group,
  );

  /*
    EXISTING COPY IS QUOTED AS EVIDENCE, NOT AS APPROVED TEXT.

    The imported blurbs came from the reseller and several of them make claims:
    the scalp oil's reads "Stimulates scalp and promotes hair growth". Passing
    that under a neutral label like "Existing description" hands the model a
    result claim as ground truth, and it will quite reasonably build on it. The
    guardrail in the system prompt forbids inventing claims; it cannot forbid
    repeating one we supplied ourselves.

    So it is labelled for what it is, with an explicit instruction not to carry
    the claims forward. Rewriting these blurbs at source is the real fix and is
    a job for Alberta, not for a regex.
  */
  const claimy = product.blurb
    ? /(stimulat|promot|treat|cure|heal|repair|restore|fight|eliminat|prevent|clinical|dermatolog)/i.test(
        product.blurb,
      )
    : false;

  const lines = [
    `Product: ${product.name}`,
    `Price: ${formatPrice(product.priceMinor)}`,
    product.compareAtMinor
      ? `Usual price: ${formatPrice(product.compareAtMinor)}`
      : null,
    `Category: ${product.category}`,
    product.blurb
      ? `Previous copy, UNVERIFIED, written by a reseller and not approved by Efe. Use it only to learn what the product IS. Do not repeat any effect or result it claims${claimy ? ", and note that it does claim one" : ""}: "${product.blurb}"`
      : null,
    product.ingredients
      ? `Ingredients as listed on the product: ${product.ingredients}`
      : "Ingredients: NOT RECORDED. Do not guess at them.",
    product.howToUse ? `How to use, as written by Efe: ${product.howToUse}` : null,
    family.length > 1
      ? `Available sizes: ${family
          .map((v) => `${v.sizeMl ? `${v.sizeMl}ml` : v.sizeG ? `${v.sizeG}g` : "one size"} at ${formatPrice(v.priceMinor)}`)
          .join(", ")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * The whole shelf, compactly, for questions that range across the catalogue.
 *
 * Prices come from the live catalogue rather than being summarised, because a
 * price is the fact a model is most likely to round, and a wrong price quoted to
 * a customer is a promise the business has to either honour or break.
 */
export async function catalogueFacts(): Promise<string> {
  const shelf = await listShelf();
  const settings = await getShopSettings();

  const products = shelf
    .map((group) => {
      const sizes = group.variants
        .map((variant) => {
          const size = variant.sizeMl
            ? `${variant.sizeMl}ml`
            : variant.sizeG
              ? `${variant.sizeG}g`
              : "one size";
          return `${size} ${formatPrice(variant.priceMinor)}`;
        })
        .join(", ");
      return `- ${group.name} (${group.category}): ${sizes}`;
    })
    .join("\n");

  return [
    `Shop: Efe Organics, ${shelf.length} products.`,
    "",
    "CATALOGUE (name, category, sizes and prices):",
    products,
    "",
    settings.announcement.active && settings.announcement.text
      ? `Current announcement: ${settings.announcement.text}`
      : null,
    "Delivery: quoted per order once the town is known. Do not state a delivery price or time.",
    "Payment: mobile money and card. Nothing is charged until Efe confirms the total.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Live stock, for questions like "is the lemon bath available".
 *
 * Returns a clear statement that stock is not tracked when it is not, rather
 * than an empty list. "No stock information" and "everything is out of stock"
 * are opposite answers and a model handed an empty list will pick the wrong one.
 */
export async function stockFacts(): Promise<string> {
  const db = getDb();
  if (!db) return "Stock levels are not available. Do not state availability.";

  const { variants, products } = await import("@/db/schema");
  const { eq, isNull, and } = await import("drizzle-orm");

  const rows = await db
    .select({
      name: products.name,
      sizeLabel: variants.sizeLabel,
      stockQty: variants.stockQty,
      trackStock: variants.trackStock,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(isNull(variants.archivedAt), eq(products.status, "active")));

  const tracked = rows.filter((row) => row.trackStock);
  if (tracked.length === 0) {
    return "Stock is not being tracked for any product, so availability is unknown. Do not tell a customer whether something is in stock.";
  }

  return [
    "STOCK (only these are tracked; anything absent has unknown availability):",
    ...tracked.map(
      (row) =>
        `- ${row.name}${row.sizeLabel ? ` ${row.sizeLabel}` : ""}: ${
          row.stockQty > 0 ? `${row.stockQty} available` : "out of stock"
        }`,
    ),
  ].join("\n");
}

/** Brand voice, drawn from copy a human wrote and approved. */
export async function voiceFacts(): Promise<string> {
  const { brand } = await import("@/lib/brand");
  return [
    "HOW EFE WRITES ABOUT ITSELF (match this register, do not copy it):",
    ...brand.story.body.map((paragraph) => `- ${paragraph}`),
    "",
    "VALUES, in Efe's own words:",
    ...brand.values.map((value) => `- ${value.title}: ${value.body}`),
  ].join("\n");
}

/** Recent orders summary, payment statuses, and unpaid MoMo orders. */
export async function ordersFacts(): Promise<string> {
  const db = getDb();
  if (!db) return "Orders database is not available.";

  const { orders } = await import("@/db/schema");
  const { desc } = await import("drizzle-orm");

  const rows = await db
    .select({
      reference: orders.reference,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      totalMinor: orders.totalMinor,
      deliveryTown: orders.deliveryTown,
      momoReference: orders.momoReference,
      deliveryName: orders.deliveryName,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .orderBy(desc(orders.placedAt))
    .limit(15);

  if (rows.length === 0) return "No orders recorded in the system yet.";

  const summary = rows.map((r) => {
    const priceGhs = (r.totalMinor / 100).toFixed(2);
    const date = new Date(r.placedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    return `- Order ${r.reference}: GH₵${priceGhs} | Status: ${r.status} (${r.paymentStatus}) | Customer: ${r.deliveryName || "Guest"} (${r.deliveryTown || "Accra"}) | MoMo Ref: ${r.momoReference || "None"} | Date: ${date}`;
  });

  return [
    "RECENT ORDERS (Last 15 orders):",
    ...summary,
  ].join("\n");
}

/** Registered reseller stockists and B2B accounts. */
export async function stockistFacts(): Promise<string> {
  const db = getDb();
  if (!db) return "Stockist database is not available.";

  const { stockists } = await import("@/db/schema");
  const { desc } = await import("drizzle-orm");

  const rows = await db
    .select({
      businessName: stockists.businessName,
      contactName: stockists.contactName,
      tier: stockists.tier,
      status: stockists.status,
      town: stockists.town,
    })
    .from(stockists)
    .orderBy(desc(stockists.createdAt))
    .limit(10);

  if (rows.length === 0) return "No registered stockists in system yet.";

  const summary = rows.map(
    (s) => `- ${s.businessName} (${s.contactName}): ${s.tier.toUpperCase()} tier | Status: ${s.status} | Location: ${s.town || "Ghana"}`,
  );

  return ["STOCKISTS & B2B RESELLER ACCOUNTS:", ...summary].join("\n");
}

