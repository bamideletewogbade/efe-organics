/**
 * Crawls the running dev server and reports every broken internal link.
 *
 *   node scripts/check-links.mjs [origin]
 *
 * Written because "the site is full of dead links" was found by hand, which is
 * exactly the kind of thing that should not need a person. It walks every
 * internal href from the entry pages, follows them breadth-first, and reports
 * anything that is not 200 — along with which page linked to it, since a 404 is
 * useless without knowing where it came from.
 *
 * External links are checked for reachability but never crawled.
 */

const ORIGIN = process.argv[2] ?? "http://localhost:3230";
const ENTRY = ["/", "/shop", "/about", "/stockists", "/partners", "/contact"];

const seen = new Map(); // path -> status
const sources = new Map(); // path -> Set of pages that link to it
const external = new Map();
const queue = [...ENTRY];

for (const path of ENTRY) sources.set(path, new Set(["(entry)"]));

function record(target, from) {
  if (!sources.has(target)) sources.set(target, new Set());
  sources.get(target).add(from);
}

function hrefsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"#][^"]*)"/g)) out.add(m[1]);
  return out;
}

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;

  let res;
  try {
    res = await fetch(new URL(path, ORIGIN));
  } catch (error) {
    seen.set(path, `ERR ${error.message}`);
    continue;
  }
  seen.set(path, res.status);

  if (!res.ok) continue;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) continue;

  const html = await res.text();

  for (const href of hrefsIn(html)) {
    if (href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    if (href.startsWith("http")) {
      const url = new URL(href);
      if (url.origin === ORIGIN) {
        const local = url.pathname + url.search;
        record(local, path);
        if (!seen.has(local)) queue.push(local);
      } else if (!external.has(href)) {
        external.set(href, null);
        record(href, path);
      }
      continue;
    }

    if (!href.startsWith("/")) continue; // relative/anchor — skip
    record(href, path);
    if (!seen.has(href)) queue.push(href);
  }
}

/* External links — HEAD only, and failures are warnings not errors: many hosts
   block HEAD from unknown agents, which is not the same as a broken link. */
for (const href of external.keys()) {
  try {
    const res = await fetch(href, { method: "HEAD", redirect: "follow" });
    external.set(href, res.status);
  } catch {
    external.set(href, "unreachable");
  }
}

const broken = [...seen.entries()].filter(([, status]) => status !== 200);

console.log(`Crawled ${seen.size} internal pages from ${ORIGIN}\n`);

if (broken.length === 0) {
  console.log("No broken internal links.");
} else {
  console.log(`${broken.length} BROKEN:\n`);
  for (const [path, status] of broken) {
    console.log(`  ${status}  ${path}`);
    for (const from of sources.get(path) ?? []) console.log(`         linked from ${from}`);
  }
}

console.log(`\nExternal (${external.size}):`);
for (const [href, status] of external) {
  const ok = status === 200 || status === 301 || status === 302;
  console.log(`  ${ok ? "ok " : "?? "} ${status}  ${href}`);
}

process.exit(broken.length ? 1 : 0);
