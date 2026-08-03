/**
 * Classifies every product photograph by what kind of shot it is.
 *
 *   node scripts/audit-product-images.mjs
 *
 * The imported set turned out to be two different things mixed together: flat
 * studio packshots on a light sweep, and lifestyle shots of the product in a
 * real room. They suit completely different places on the site, and nothing
 * recorded which was which, so this works it out from the pixels.
 *
 * Classification is by the four corners. A studio sweep has four light, nearly
 * identical corners; a lifestyle shot has darker corners that disagree with each
 * other. Crude, and correct on this set.
 */

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public", "products");

/** Mean colour of a small square at each corner. */
async function corners(path) {
  const image = sharp(path);
  const { width, height } = await image.metadata();
  const size = Math.max(8, Math.floor(Math.min(width, height) * 0.04));
  const spots = [
    { left: 0, top: 0 },
    { left: width - size, top: 0 },
    { left: 0, top: height - size },
    { left: width - size, top: height - size },
  ];

  const means = [];
  for (const spot of spots) {
    const { data } = await image
      .clone()
      .extract({ ...spot, width: size, height: size })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 3) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    means.push([r / n, g / n, b / n]);
  }
  return { means, width, height };
}

const rows = [];
const dirs = (await readdir(SRC, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const dir of dirs) {
  const files = (await readdir(join(SRC, dir))).filter((f) =>
    /\.(png|jpe?g|webp)$/i.test(f),
  );
  for (const file of files) {
    const path = join(SRC, dir, file);
    try {
      const { means, width, height } = await corners(path);
      const brightness = means.map((m) => (m[0] + m[1] + m[2]) / 3);
      const minBright = Math.min(...brightness);
      const spread = Math.max(...brightness) - minBright;

      // Studio: every corner bright and all four in agreement.
      const studio = minBright > 200 && spread < 26;
      rows.push({
        src: `/products/${dir}/${file}`,
        dir,
        file,
        width,
        height,
        kind: studio ? "studio" : "lifestyle",
        minBright: Math.round(minBright),
        spread: Math.round(spread),
      });
    } catch (error) {
      rows.push({
        src: `/products/${dir}/${file}`,
        kind: "error",
        error: error.message,
      });
    }
  }
}

const studio = rows.filter((r) => r.kind === "studio");
const lifestyle = rows.filter((r) => r.kind === "lifestyle");

console.log(`${rows.length} images`);
console.log(`  studio packshots : ${studio.length}`);
console.log(`  lifestyle shots  : ${lifestyle.length}`);
console.log("\n-- lifestyle --");
lifestyle.forEach((r) =>
  console.log(
    `  ${r.src.padEnd(58)} ${r.width}x${r.height}  dark:${r.minBright} spread:${r.spread}`,
  ),
);

await mkdir(join(ROOT, "scripts", "out"), { recursive: true });
await writeFile(
  join(ROOT, "scripts", "out", "image-audit.json"),
  JSON.stringify({ studio, lifestyle }, null, 2),
  "utf8",
);
