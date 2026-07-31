/**
 * Are the black-plate and white-paper logo renders the same artwork?
 *
 * If they are pixel-aligned, we can recover a genuinely transparent PNG:
 * compositing the same foreground over two known backgrounds gives
 *   over black: B = a·F
 *   over white: W = a·F + (1-a)·255
 * so  a = 1 - (W - B)/255  and  F = B/a.
 *
 * That would finally give the site a logo that sits on any surface — the single
 * biggest brand-asset gap in the project.
 *
 * If they are separate AI renders, the glyphs will not line up and the recovery
 * produces mush. This script measures that before we rely on it: it compares
 * the "where is the gold" masks with an intersection-over-union score.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLACK = join(ROOT, "public", "brand", "efe-monogram-gold.jpg");
const WHITE = join(ROOT, "public", "brand", "efe-monogram-gold-light.jpg");
const N = 256; // compare at low res; alignment error shows up plainly

/** Mask of "this pixel is saturated gold/green", i.e. part of the mark. */
async function markMask(file) {
  const { data } = await sharp(file)
    .resize(N, N, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Chroma separates the coloured mark from both the black plate and the
    // white paper, which are near-neutral.
    mask[i] = max - min > 38 ? 1 : 0;
  }
  return mask;
}

const [a, b] = await Promise.all([markMask(BLACK), markMask(WHITE)]);

let inter = 0;
let union = 0;
let onlyA = 0;
let onlyB = 0;
for (let i = 0; i < a.length; i++) {
  if (a[i] && b[i]) inter++;
  if (a[i] || b[i]) union++;
  if (a[i] && !b[i]) onlyA++;
  if (!a[i] && b[i]) onlyB++;
}

const iou = union ? inter / union : 0;
console.log(`mark pixels — black plate: ${a.reduce((s, v) => s + v, 0)}`);
console.log(`mark pixels — white paper: ${b.reduce((s, v) => s + v, 0)}`);
console.log(`only on black: ${onlyA}   only on white: ${onlyB}`);
console.log(`\nIoU = ${iou.toFixed(3)}`);
console.log(
  iou > 0.9
    ? "\nALIGNED — alpha recovery will work."
    : "\nNOT ALIGNED — separate renders. Use each variant on its matching surface instead.",
);
