/**
 * Reads the real colours out of the logo artwork so the palette is derived from
 * the brand mark rather than guessed at.
 *
 *   node scripts/sample-brand-palette.mjs
 *
 * Buckets every pixel of both master renders by hue, then reports the median
 * colour and the light/dark extremes of each bucket. Median rather than mean:
 * the gold has specular highlights and cast shadow, and a mean smears those
 * into a muddy beige that appears nowhere in the artwork.
 *
 * Output is advisory. It tells us what the mark is actually made of. The tokens
 * in globals.css are then chosen from that, adjusted for contrast.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  ["black plate", join(ROOT, "public", "brand", "efe-monogram-gold.jpg")],
  ["white paper", join(ROOT, "public", "brand", "efe-monogram-gold-light.jpg")],
];

const hex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function hue(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function report(label, pixels) {
  if (pixels.length < 50) {
    console.log(`  ${label.padEnd(14)}, too few pixels`);
    return;
  }
  const byLuma = pixels.slice().sort((a, b) => luma(...a) - luma(...b));
  const mid = median(pixels.map((p) => luma(...p)));
  const midPixel =
    byLuma.find((p) => luma(...p) >= mid) ?? byLuma[byLuma.length >> 1];

  const shadow = byLuma[Math.floor(byLuma.length * 0.12)];
  const highlight = byLuma[Math.floor(byLuma.length * 0.88)];

  console.log(
    `  ${label.padEnd(14)} ${hex(...midPixel)}   shadow ${hex(...shadow)}   highlight ${hex(...highlight)}   (${pixels.length} px)`,
  );
}

for (const [name, file] of SOURCES) {
  const { data, info } = await sharp(file)
    .resize(600, 600, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gold = [];
  const green = [];
  const ground = [];

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const h = hue(r, g, b);

    if (chroma < 12) ground.push([r, g, b]);
    else if (chroma > 45 && h >= 30 && h <= 62) gold.push([r, g, b]);
    else if (chroma > 30 && h > 62 && h <= 160) green.push([r, g, b]);
  }

  console.log(`\n${name}`);
  report("gold", gold);
  report("leaf green", green);
  report("ground", ground);
}

console.log(
  "\nUse the mid value as the token; shadow/highlight bound any gradient.",
);
