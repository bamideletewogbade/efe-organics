/**
 * Generates src/lib/catalog.data.ts from the reseller scrape + the curation map.
 *
 *   node scripts/scrape-reseller.mjs && node scripts/generate-catalog.mjs
 *
 * The generated file is committed — the site must build without network access.
 * Edit `curation.mjs` (taxonomy) or re-run the scrape (facts); never hand-edit
 * the generated output.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CURATION } from "./curation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IN = join(ROOT, "scripts", "out", "reseller-catalogue.json");
const OUT = join(ROOT, "src", "lib", "catalog.data.ts");

const source = JSON.parse(await readFile(IN, "utf8"));

const CATEGORY_ORDER = [
  "black-soap",
  "hair-care",
  "body-care",
  "lotions-butters",
  "skincare",
  "oils",
];

const q = (s) => JSON.stringify(s);

/** Strip the size off a display name — the size selector renders it instead. */
function baseName(name) {
  return name
    .replace(/\s*\d+(\.\d+)?\s*(ml|ltr|litre|liter|l|g|kgs|kg)\b\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.]+$/, "")
    .trim();
}

const missing = [];
const products = [];

for (const record of source.products) {
  const rule = CURATION[record.slug];
  if (!rule) {
    missing.push(record.slug);
    continue;
  }

  const price = Math.round(record.price * 100);
  const compareAt = record.originalPrice
    ? Math.round(record.originalPrice * 100)
    : undefined;

  products.push({
    ...rule,
    name: record.name.trim(),
    baseName: rule.group ? baseName(record.name) : undefined,
    priceMinor: price,
    compareAtMinor: compareAt && compareAt > price ? compareAt : undefined,
    blurb: record.description,
    ingredients: record.ingredients,
    howToUse: record.howToUse,
    tags: record.tags?.length ? record.tags : undefined,
    inStock: record.inStock,
    images: record.localImages ?? [],
    sourceSlug: record.slug,
  });
}

products.sort((a, b) => {
  const byCategory =
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  if (byCategory !== 0) return byCategory;
  if (a.group !== b.group) return (a.group ?? "").localeCompare(b.group ?? "");
  return a.priceMinor - b.priceMinor;
});

const body = products
  .map((p) => {
    const lines = [
      `    slug: ${q(p.slug)},`,
      `    name: ${q(p.name)},`,
      p.baseName && p.baseName !== p.name ? `    baseName: ${q(p.baseName)},` : null,
      `    category: ${q(p.category)},`,
      `    line: ${q(p.line)},`,
      p.group ? `    group: ${q(p.group)},` : null,
      p.wholesale ? `    wholesale: true,` : null,
      `    priceMinor: ${p.priceMinor},`,
      p.compareAtMinor ? `    compareAtMinor: ${p.compareAtMinor},` : null,
      p.sizeMl ? `    sizeMl: ${p.sizeMl},` : null,
      p.sizeG ? `    sizeG: ${p.sizeG},` : null,
      p.blurb ? `    blurb: ${q(p.blurb)},` : null,
      p.ingredients ? `    ingredients: ${q(p.ingredients)},` : null,
      p.howToUse ? `    howToUse: ${q(p.howToUse)},` : null,
      p.tags ? `    tags: [${p.tags.map(q).join(", ")}],` : null,
      `    inStock: ${p.inStock},`,
      `    images: [${p.images.map(q).join(", ")}],`,
    ].filter(Boolean);
    return `  {\n${lines.join("\n")}\n  },`;
  })
  .join("\n");

const groups = new Set(products.filter((p) => p.group).map((p) => p.group));
const shelf = products.filter((p) => !p.wholesale);
const decisions = new Set(shelf.map((p) => p.group ?? p.slug)).size;

const file = `/**
 * GENERATED FILE — do not edit by hand.
 *
 *   node scripts/scrape-reseller.mjs      # refresh facts from the reseller
 *   node scripts/generate-catalog.mjs     # rebuild this file
 *
 * Facts (names, prices, copy, ingredients, imagery) come from the live
 * Coloursbay listing, captured ${source.capturedAt.slice(0, 10)}.
 * Taxonomy (category, line, size, variant grouping, slugs) comes from
 * scripts/curation.mjs — the reseller's own categories are not usable.
 *
 * IMAGERY: imported from the reseller as a working placeholder set. Ownership
 * is unconfirmed — see public/products/README.md before launch.
 *
 * PRICES: the reseller's selling prices, not confirmed as Efe's own RRP.
 * See docs/OPEN-QUESTIONS.md #1 — do not switch on checkout against these.
 *
 * ${products.length} SKUs · ${shelf.length} on the consumer shelf · ${decisions} buying decisions
 * after variant grouping (${groups.size} size families).
 */

import type { Product } from "./catalog";

export const PRODUCTS: Product[] = [
${body}
];
`;

await writeFile(OUT, file);

if (missing.length) {
  console.warn(`\n! ${missing.length} scraped SKU(s) missing from curation.mjs:`);
  for (const slug of missing) console.warn(`   ${slug}`);
}

console.log(
  `\nWrote ${OUT}\n${products.length} SKUs · ${shelf.length} on the shelf · ` +
    `${decisions} buying decisions · ${groups.size} size families`,
);
