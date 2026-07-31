/**
 * Builds the site's logo and icon set from the two supplied master renders.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Inputs (3000×3000 JPEGs, no alpha):
 *   public/brand/efe-monogram-gold.jpg        gold "Efe" + tea leaf on a black plate
 *   public/brand/efe-monogram-gold-light.jpg  the same mark on white paper
 *
 * WHY TWO KEYS INSTEAD OF ONE TRANSPARENT FILE:
 * Compositing one foreground over two known backgrounds normally lets you solve
 * for alpha exactly. `check-logo-alignment.mjs` measured the two renders at
 * IoU 0.849 — they are separate generations, not one artwork on two grounds (the
 * leaf differs), so that recovery would ghost. Instead each variant is keyed
 * against its OWN background. The result: two transparent PNGs whose anti-
 * aliased edges carry the tint of the surface they belong on, so fringing is
 * invisible where each is used.
 *
 *   mark-on-light.png → cream/paper surfaces (header, light sections)
 *   mark-on-dark.png  → black/forest plates (hero, footer, chips)
 *
 * Keying works because the mark is high-chroma gold and green while both grounds
 * are near-neutral, so chroma alone separates them — no hand masking, and it
 * re-runs if the brand sends new renders.
 *
 * Outputs (all committed):
 *   public/brand/mark-on-light.png   1024, transparent
 *   public/brand/mark-on-dark.png    1024, transparent
 *   src/app/icon.png                  512, on plate — Next serves as favicon
 *   src/app/apple-icon.png            180, on plate
 *
 * A vector original would still be better — see docs/OPEN-QUESTIONS.md #9.
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DARK_SRC = join(ROOT, "public", "brand", "efe-monogram-gold.jpg");
const LIGHT_SRC = join(ROOT, "public", "brand", "efe-monogram-gold-light.jpg");

/**
 * Crop window, as fractions of the master's edge.
 *
 * Deliberately GENEROUS rather than tight. A tight window has to be re-tuned by
 * hand for every new render, and a first attempt at 0.48 wide silently sliced
 * through the "fe". The alpha `trim` below finds the true ink bounds, so the
 * only job here is to exclude the plate's outer vignette without touching art.
 *
 * ORGANICS overlaps the glyph's bounding box, so it cannot be cropped away
 * without cutting the descender swash — it stays, and reads as fine texture at
 * favicon sizes.
 */
const GLYPH = { left: 0.04, top: 0.12, width: 0.92, height: 0.78 };

/** Chroma at which a pixel is fully part of the mark. */
const CHROMA_SOLID = 55;
/** Below this it is background. Between the two, alpha ramps — soft edges. */
const CHROMA_EDGE = 14;

async function boxFor(file) {
  const { width = 0, height = 0 } = await sharp(file).metadata();
  if (!width || !height) throw new Error(`Cannot read ${file}`);
  return {
    left: Math.round(GLYPH.left * width),
    top: Math.round(GLYPH.top * height),
    width: Math.round(GLYPH.width * width),
    height: Math.round(GLYPH.height * height),
  };
}

/** Key out a near-neutral background using chroma, keeping original colour. */
async function keyByChroma(file, box) {
  const { data, info } = await sharp(file)
    .extract(box)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const out = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const alpha = Math.max(
      0,
      Math.min(1, (chroma - CHROMA_EDGE) / (CHROMA_SOLID - CHROMA_EDGE)),
    );

    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.round(alpha * 255);
  }

  return { buffer: out, width: info.width, height: info.height };
}

async function writeTransparent(src, outPath) {
  const box = await boxFor(src);
  const { buffer, width, height } = await keyByChroma(src, box);

  await mkdir(dirname(outPath), { recursive: true });
  await sharp(buffer, { raw: { width, height, channels: 4 } })
    // Trim the empty margin the fixed crop leaves, so the PNG's bounds are the
    // mark's bounds and layout needn't compensate for padding.
    // Trim to the ink, then scale by HEIGHT only — no forced square. Padding
    // baked into the file would make the header logo impossible to align, and
    // the natural aspect is what `next/image` needs to reserve correct space.
    .trim({ threshold: 1 })
    .resize({ height: 512, withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const out = await sharp(outPath).metadata();
  console.log(
    `transparent  ${outPath.replace(ROOT, ".")}  ${out.width}x${out.height}`,
  );
}

/**
 * Favicon keeps the plate — a keyed mark disappears on a dark browser tab.
 *
 * Built from the trimmed transparent mark composited back onto the plate colour,
 * so the ink fills the tile properly. Cropping the JPEG directly leaves the
 * master's dead margin baked in, which renders as a dot in a black box at 32px.
 */
async function writeIcon(outPath, size, padding = 0.1) {
  const box = await boxFor(DARK_SRC);
  const { buffer, width, height } = await keyByChroma(DARK_SRC, box);

  const inner = Math.round(size * (1 - padding * 2));
  const mark = await sharp(buffer, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await mkdir(dirname(outPath), { recursive: true });
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 13, g: 13, b: 13, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`icon ${size}px    ${outPath.replace(ROOT, ".")}`);
}

await writeTransparent(LIGHT_SRC, join(ROOT, "public", "brand", "mark-on-light.png"));
await writeTransparent(DARK_SRC, join(ROOT, "public", "brand", "mark-on-dark.png"));
await writeIcon(join(ROOT, "src", "app", "icon.png"), 512);
await writeIcon(join(ROOT, "src", "app", "apple-icon.png"), 180);

console.log("\nDone.");
