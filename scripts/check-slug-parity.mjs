/**
 * Compares the slugs the database serves against the committed static file.
 *
 *   npx tsx --env-file=.env.local scripts/check-slug-parity.mjs
 *
 * WHY THIS MATTERS MORE THAN IT SOUNDS
 *
 * A product slug is a URL. Anything already indexed, linked, bookmarked, or
 * pasted into a WhatsApp message points at the static file's slug. If the
 * database serves a different one, every one of those becomes a 404 the moment
 * the repository swap goes live, and nothing looks broken from the inside: the
 * shop lists products fine, they just all live at new addresses.
 *
 * Queries Postgres directly rather than importing the adapter, because the
 * adapter is marked `server-only` and, more usefully, because this should check
 * what the DATABASE holds rather than what our own mapping code believes.
 */
import postgres from "postgres";

import { PRODUCTS } from "../src/lib/catalog.data.ts";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const rows = await sql`
  select v.slug, v.price_minor, p.name, p.status
  from variants v
  join products p on p.id = v.product_id
  where v.archived_at is null
    and p.archived_at is null
    and p.status = 'active'
`;

const staticSlugs = new Set(PRODUCTS.map((p) => p.slug));
const dbSlugs = new Set(rows.map((r) => r.slug));

const missing = [...staticSlugs].filter((slug) => !dbSlugs.has(slug));
const added = [...dbSlugs].filter((slug) => !staticSlugs.has(slug));

console.log(`static file : ${staticSlugs.size} slugs`);
console.log(`database    : ${dbSlugs.size} slugs`);
console.log(`in both     : ${[...staticSlugs].filter((s) => dbSlugs.has(s)).length}`);

if (missing.length) {
  console.log(`\nWOULD 404 (${missing.length}), these URLs exist today and would break:`);
  missing.slice(0, 50).forEach((slug) => console.log(`  /shop/${slug}`));
}

if (added.length) {
  console.log(`\nONLY IN THE DATABASE (${added.length}):`);
  added.slice(0, 50).forEach((slug) => console.log(`  /shop/${slug}`));
}

const byDbSlug = new Map(rows.map((r) => [r.slug, r]));
const drift = [];
for (const product of PRODUCTS) {
  const match = byDbSlug.get(product.slug);
  if (!match) continue;
  if (Number(match.price_minor) !== product.priceMinor) {
    drift.push(
      `  ${product.slug}: file GH₵${(product.priceMinor / 100).toFixed(2)} vs db GH₵${(Number(match.price_minor) / 100).toFixed(2)}`,
    );
  }
}
if (drift.length) {
  console.log(`\nPRICE DIFFERENCES (${drift.length}), the database wins:`);
  drift.slice(0, 20).forEach((line) => console.log(line));
}

await sql.end();

console.log(
  missing.length === 0
    ? "\nPASS: every existing URL still resolves"
    : `\nFAIL: ${missing.length} existing URLs would 404`,
);
process.exit(missing.length === 0 ? 0 : 1);
