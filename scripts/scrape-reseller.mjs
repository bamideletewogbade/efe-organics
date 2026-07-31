/**
 * One-off importer: pulls the Efe Organics catalogue off the reseller
 * (coloursbay.com) so we can build against real names, prices, sizes,
 * ingredients and photography instead of placeholders.
 *
 *   node scripts/scrape-reseller.mjs
 *
 * Writes:
 *   scripts/out/reseller-catalogue.json   raw product records
 *   public/products/<slug>/<n>.<ext>      downloaded imagery
 *
 * IMPORTANT — the imagery is the RESELLER'S upload of Efe's products. It is
 * imported as a working placeholder set so the site can be built and reviewed.
 * Confirm ownership with Efe (or reshoot) before launch. See
 * docs/OPEN-QUESTIONS.md #7 and public/products/README.md.
 *
 * The reseller is a Next.js app; each product page embeds its record in the RSC
 * flight payload as `"product":{...}`. We fetch the HTML and brace-match that
 * object rather than parsing the DOM.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://www.coloursbay.com";
const BRAND = "Efe Organics";
const OUT_JSON = join(ROOT, "scripts", "out", "reseller-catalogue.json");
const IMAGE_DIR = join(ROOT, "public", "products");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "efe-organics-import/1.0 (+internal build tool)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/**
 * The flight payload lives inside JS string literals, so every quote in the
 * HTML arrives as `\"`. Unescape one level, left to right, before any brace
 * matching — otherwise a string-aware matcher never sees a closing quote and
 * runs off the end of the document. `\n` and friends are left intact so the
 * result is still valid JSON.
 */
function unescapeFlight(source) {
  return source.replace(/\\(.)/g, (match, char) =>
    char === '"' ? '"' : char === "\\" ? "\\" : match,
  );
}

/** Extract a balanced JSON object starting at the `{` that follows `marker`. */
function extractObjectAfter(source, marker, from = 0) {
  const at = source.indexOf(marker, from);
  if (at === -1) return null;

  let i = source.indexOf("{", at + marker.length);
  if (i === -1) return null;

  const start = i;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { raw: source.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** All /shop/<slug> hrefs on a page. */
function slugsIn(html) {
  const found = new Set();
  for (const m of html.matchAll(/\/shop\/([a-z0-9][a-z0-9-]*)/g)) found.add(m[1]);
  return found;
}

function cleanProduct(p) {
  const images = [...new Set([p.image, ...(p.images ?? [])].filter(Boolean))];
  return {
    slug: p.slug,
    name: (p.name ?? "").trim(),
    brand: p.brand,
    category: p.category,
    categorySlug: p.categorySlug,
    price: p.price,
    originalPrice: p.originalPrice === p.price ? undefined : p.originalPrice,
    description: (p.description ?? "").trim() || undefined,
    ingredients: (p.ingredients ?? "").trim() || undefined,
    howToUse: (p.howToUse ?? "").trim() || undefined,
    tags: p.tags ?? [],
    inStock: p.inStock !== false,
    volumeMl: p.volumeMl === "$undefined" ? undefined : p.volumeMl,
    images,
  };
}

async function downloadImages(product) {
  const local = [];
  for (const [index, url] of product.images.entries()) {
    const ext = (url.split(".").pop() ?? "jpg").toLowerCase().slice(0, 4);
    const rel = `/products/${product.slug}/${index + 1}.${ext}`;
    const abs = join(IMAGE_DIR, product.slug, `${index + 1}.${ext}`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, Buffer.from(await res.arrayBuffer()));
      local.push(rel);
    } catch (error) {
      console.warn(`  ! image failed ${url} — ${error.message}`);
    }
  }
  return local;
}

/* -------------------------------------------------------------------------- */

console.log("Seeding slugs from /shop …");
const queue = [...slugsIn(await getText(`${ORIGIN}/shop`))];
const seen = new Set(queue);
const products = [];
let skipped = 0;

while (queue.length) {
  const slug = queue.shift();
  let html;
  try {
    html = await getText(`${ORIGIN}/shop/${slug}`);
  } catch (error) {
    console.warn(`! ${slug} — ${error.message}`);
    continue;
  }

  // Follow "You might also like" to reach SKUs missing from the shop index —
  // that is how the 250kg bulk crumble surfaces.
  for (const next of slugsIn(html)) {
    if (!seen.has(next)) {
      seen.add(next);
      queue.push(next);
    }
  }

  const hit = extractObjectAfter(unescapeFlight(html), '"product":');
  const record = hit && parseJson(hit.raw);

  if (!record?.slug) {
    console.warn(`? ${slug} — no product record`);
    continue;
  }
  if (record.brand !== BRAND) {
    skipped++;
    continue;
  }

  const product = cleanProduct(record);
  console.log(
    `+ ${product.slug} — ₵${product.price} — ${product.images.length} image(s)`,
  );
  product.localImages = await downloadImages(product);
  products.push(product);

  await sleep(150); // be a polite guest
}

products.sort((a, b) => a.slug.localeCompare(b.slug));

await mkdir(dirname(OUT_JSON), { recursive: true });
await writeFile(
  OUT_JSON,
  JSON.stringify(
    { source: ORIGIN, brand: BRAND, capturedAt: new Date().toISOString(), products },
    null,
    2,
  ),
);

const images = products.reduce((n, p) => n + p.localImages.length, 0);
console.log(
  `\nDone. ${products.length} ${BRAND} products, ${images} images. ` +
    `${skipped} other-brand SKUs skipped.\n→ ${OUT_JSON}`,
);
