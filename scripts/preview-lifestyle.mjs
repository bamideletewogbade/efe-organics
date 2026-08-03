/**
 * Contact sheet of the lifestyle shots found by audit-product-images.mjs.
 *
 *   node scripts/audit-product-images.mjs && node scripts/preview-cutouts.mjs
 *
 * Exists because a classifier score cannot tell you whether a photograph is
 * usable. Something has to actually look at them before they go on the About
 * page, and 25 separate file opens is not that.
 */

import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "out", "lifestyle-preview.png");

const audit = JSON.parse(
  await readFile(join(ROOT, "scripts", "out", "image-audit.json"), "utf8"),
);

const CELL = 260;
const COLS = 5;
const rows = Math.ceil(audit.lifestyle.length / COLS);

const composites = [];
for (const [index, row] of audit.lifestyle.entries()) {
  const buffer = await sharp(join(ROOT, "public", row.src))
    .resize({ width: CELL, height: CELL, fit: "cover" })
    .toBuffer();
  composites.push({
    input: buffer,
    left: (index % COLS) * CELL,
    top: Math.floor(index / COLS) * CELL,
  });
}

await mkdir(join(ROOT, "scripts", "out"), { recursive: true });
await sharp({
  create: {
    width: COLS * CELL,
    height: rows * CELL,
    channels: 4,
    background: { r: 13, g: 44, b: 29, alpha: 1 },
  },
})
  .composite(composites)
  .png()
  .toFile(OUT);

console.log(`${audit.lifestyle.length} lifestyle shots -> ${OUT}`);
audit.lifestyle.forEach((r, i) =>
  console.log(`  ${String(i + 1).padStart(2)}  ${r.src}`),
);
