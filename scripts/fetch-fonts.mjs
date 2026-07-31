/**
 * Downloads the webfonts into src/app/fonts/ so they can be served locally.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Why self-hosted rather than `next/font/google`: that helper fetches from
 * Google at BUILD time, and the build environment cannot reach it — every build
 * died on "Failed to fetch `Fraunces` from Google Fonts". Self-hosting removes
 * the network from the build entirely, and is faster for users too (one less
 * origin, no redirect chain).
 *
 * Both faces are variable, so one file each covers every weight we use.
 * Run once; the .woff2 files are committed.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "app", "fonts");

// A modern UA is required, otherwise Google serves legacy TTF instead of woff2.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FACES = [
  {
    file: "bricolage-variable.woff2",
    css: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap",
  },
  {
    file: "figtree-variable.woff2",
    css: "https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&display=swap",
  },
];

await mkdir(OUT, { recursive: true });

for (const face of FACES) {
  const css = await (await fetch(face.css, { headers: { "user-agent": UA } })).text();

  /**
   * The stylesheet ships one @font-face block per subset (vietnamese, latin-ext,
   * latin, …). We only want plain latin. Identify it by its unicode-range —
   * the latin block is the one containing U+0000-00FF — rather than by position,
   * which changes as Google adds subsets.
   */
  const blocks = css.split("@font-face").slice(1);
  const latin = blocks.find((b) => b.includes("U+0000-00FF"));
  if (!latin) throw new Error(`No latin subset found for ${face.file}`);

  const url = latin.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error(`No woff2 URL found for ${face.file}`);

  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(join(OUT, face.file), bytes);
  console.log(`${face.file}  ${(bytes.length / 1024).toFixed(1)} kB`);
}

console.log(`\nSaved to ${OUT}`);
