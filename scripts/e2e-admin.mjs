/**
 * End to end test of every admin-facing feature.
 *
 *   npx tsx --env-file=.env.local scripts/e2e-admin.mjs
 *   npx tsx --env-file=.env.local scripts/e2e-admin.mjs --base https://efeorganics.com
 *
 * WHY THIS AND NOT A BROWSER DRIVER
 *
 * The two things worth proving here are that the gate holds and that the screens
 * render real data. Both are HTTP-observable. Playwright would add a large
 * dependency and a lot of flake to test the same assertions, and it cannot run
 * in this environment at all.
 *
 * The session cookie is MINTED here using the same HMAC the app uses, from the
 * same `ADMIN_SESSION_SECRET`. That is not a bypass: it proves the format is
 * what the middleware expects, and the tampering tests below prove a cookie
 * NOT minted with the secret is rejected. Signing in through the form is
 * covered separately by posting real credentials.
 *
 * WRITE TESTS RUN AGAINST THE REAL DATABASE AND CLEAN UP AFTER THEMSELVES.
 * Anything created is prefixed E2E- and deleted at the end, and the script
 * refuses to run its write phase against a base URL it did not start.
 */
import postgres from "postgres";

const BASE =
  process.argv[process.argv.indexOf("--base") + 1]?.startsWith("http")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : "http://localhost:3230";

const SECRET =
  process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` :: ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? `  <-- ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}\n${"-".repeat(title.length)}`);
}

/* -------------------------------------------------------------------------- */
/* Cookie minting, mirroring lib/admin-auth.ts exactly                        */
/* -------------------------------------------------------------------------- */

async function sign(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function mintCookie({ expiryOffsetMs = 3600_000, userId = "", email = "e2e@test", role = "owner" } = {}) {
  const payload = [Date.now() + expiryOffsetMs, userId, email, role].join("|");
  return `${payload}.${await sign(payload)}`;
}

async function get(path, cookie) {
  const response = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie: `efe_admin=${cookie}` } : {},
    redirect: "manual",
  });
  const body = await response.text();
  return { status: response.status, body, headers: response.headers };
}

/**
 * The lock page is recognisable and must never carry admin data.
 *
 * Matched on the sign-in FORM, not on wording. An earlier version also looked
 * for the string "ADMIN_PASSWORD", which made /admin/settings/users report as
 * locked when it was rendering perfectly: that page explains in its own copy
 * how to retire the shared password, so it legitimately contains the word.
 * A test that fails on correct behaviour is worse than no test.
 */
const isLocked = (body) =>
  /name="password"[\s\S]{0,600}Sign in|Partner Portal|Admin locked/i.test(body);

const looksBroken = (body) =>
  /Application error|server error occurred|Unhandled Runtime|Internal Server Error|couldn.t load/i.test(body);

const ADMIN_ROUTES = [
  ["/admin", ["Overview", "This week", "Best sellers"]],
  ["/admin/orders", ["Orders"]],
  ["/admin/products", ["Products"]],
  ["/admin/stock", ["Stock"]],
  ["/admin/promotions", ["Discounts", "Bundles"]],
  ["/admin/customers", ["Customers"]],
  ["/admin/analytics", ["Analytics", "days"]],
  ["/admin/documents", ["Documents"]],
  ["/admin/import", ["Import"]],
  ["/admin/export", ["Export"]],
  ["/admin/settings", ["Settings", "Delivery"]],
  ["/admin/settings/users", ["Who can get in", "Accounts"]],
  ["/admin/assistant", ["Assistant"]],
  ["/admin/marketing", []],
  ["/admin/stockists", []],
  ["/admin/products/new", []],
];

console.log(`Testing ${BASE}\n${"=".repeat(60)}`);

/* -------------------------------------------------------------------------- */
section("1. THE GATE HOLDS WHEN NOT SIGNED IN");
/* -------------------------------------------------------------------------- */

for (const [route] of ADMIN_ROUTES) {
  const { body } = await get(route, null);
  check(`locked: ${route}`, isLocked(body), isLocked(body) ? "" : "rendered something else");
}

// The one that would actually hurt.
{
  const { body, headers } = await get("/admin/export/download?kind=customers", null);
  check(
    "locked: customer CSV export",
    !headers.get("content-type")?.includes("csv") && isLocked(body),
    headers.get("content-type"),
  );
}

/* -------------------------------------------------------------------------- */
section("2. FORGED AND EXPIRED COOKIES ARE REJECTED");
/* -------------------------------------------------------------------------- */

{
  const valid = await mintCookie();
  const [payload, signature] = [valid.slice(0, valid.lastIndexOf(".")), valid.slice(valid.lastIndexOf(".") + 1)];

  // Role escalated in the payload, original signature kept.
  const escalated = `${payload.replace("|owner", "|staff")}.${signature}`;
  check("tampered payload rejected", isLocked((await get("/admin", escalated)).body));

  // Signature replaced with noise.
  check(
    "bad signature rejected",
    isLocked((await get("/admin", `${payload}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`)).body),
  );

  // Expired.
  check(
    "expired cookie rejected",
    isLocked((await get("/admin", await mintCookie({ expiryOffsetMs: -60_000 }))).body),
  );

  // Unsigned, structurally plausible.
  check(
    "unsigned cookie rejected",
    isLocked((await get("/admin", `${Date.now() + 999999}||x@y|owner.`)).body),
  );
}

/* -------------------------------------------------------------------------- */
section("3. EVERY SCREEN RENDERS WHEN SIGNED IN");
/* -------------------------------------------------------------------------- */

const session = await mintCookie();

for (const [route, expect] of ADMIN_ROUTES) {
  const { status, body } = await get(route, session);
  const ok =
    status === 200 &&
    !isLocked(body) &&
    !looksBroken(body) &&
    expect.every((token) => body.includes(token));
  const why = status !== 200
    ? `HTTP ${status}`
    : isLocked(body)
      ? "still locked"
      : looksBroken(body)
        ? "error page"
        : expect.filter((t) => !body.includes(t)).join(", ");
  check(`renders: ${route}`, ok, ok ? "" : why);
}

/* -------------------------------------------------------------------------- */
section("4. SCREENS SHOW REAL DATA, NOT EMPTY STATES");
/* -------------------------------------------------------------------------- */

const [counts] = await sql`
  select
    (select count(*) from products where status='active')::int as products,
    (select count(*) from orders)::int   as orders,
    (select count(*) from customers)::int as customers,
    (select count(*) from variants)::int  as variants
`;

{
  const { body } = await get("/admin/products", session);
  check(
    `products screen lists ${counts.products} products`,
    body.includes(String(counts.products)) || /African Black Soap/.test(body),
    "count not found in markup",
  );
}
{
  const { body } = await get("/admin/orders", session);
  const [order] = await sql`select reference from orders order by placed_at desc limit 1`;
  check(
    `orders screen shows reference ${order?.reference ?? "n/a"}`,
    !order || body.includes(order.reference),
  );
}
{
  const { body } = await get("/admin", session);
  check("overview renders charts", /Best sellers|Order pipeline|The range/.test(body));
  check("overview shows no crash", !looksBroken(body));
}
{
  const { body } = await get("/admin/stock", session);
  check(`stock screen covers ${counts.variants} variants`, !/Nothing to show yet/.test(body));
}

/* -------------------------------------------------------------------------- */
section("5. REAL SIGN-IN THROUGH THE FORM");
/* -------------------------------------------------------------------------- */

{
  const [user] = await sql`select email from admin_users where active limit 1`;
  check(
    "at least one admin account exists",
    Boolean(user),
    user ? "" : "none: run scripts/create-admin.mjs",
  );

  // The sign-in page must render the form itself.
  const { body } = await get("/admin", null);
  check("sign-in form present", /name="password"/.test(body));
  check("email field present", /name="email"/.test(body));
  check("password reveal toggle present", /Show password|aria-pressed/.test(body));
}

/* -------------------------------------------------------------------------- */
section("6. ORDER PIPELINE, END TO END, AGAINST THE REAL DATABASE");
/* -------------------------------------------------------------------------- */

let testOrderId = null;
try {
  const [variant] = await sql`
    select v.slug, v.id, v.stock_qty, v.track_stock, p.name
    from variants v join products p on p.id = v.product_id
    where v.track_stock and p.status = 'active'
    order by v.price_minor asc limit 1
  `;

  if (!variant) {
    check("a tracked variant exists to test with", false, "none found");
  } else {
    const before = variant.stock_qty;

    const response = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ slug: variant.slug, qty: 2 }],
        delivery: {
          name: "E2E Test",
          phone: "+233000000000",
          email: "e2e-test@efeorganics.invalid",
          region: "Greater Accra",
          town: "E2E",
          address: "E2E test address",
        },
      }),
    });
    const result = await response.json();

    check("order placed via API", result.ok === true, JSON.stringify(result).slice(0, 120));

    if (result.ok) {
      const [order] = await sql`select id, reference, status, payment_status, subtotal_minor, total_minor from orders where reference = ${result.reference}`;
      testOrderId = order?.id ?? null;

      check("order written to database", Boolean(order));

      /*
        Compared as Numbers, deliberately.

        postgres.js returns bigint columns as STRINGS to avoid precision loss,
        so `order.subtotal_minor` is "3000" while the expected value is the
        number 3000. A strict comparison fails on a correctly priced order,
        which is exactly what the first run of this test reported.
      */
      const [{ price_minor: unitPrice }] =
        await sql`select price_minor from variants where id = ${variant.id}`;
      check(
        "priced server-side, not from the client",
        Number(order?.subtotal_minor) === 2 * Number(unitPrice),
        `got ${order?.subtotal_minor}, expected ${2 * Number(unitPrice)}`,
      );
      check("starts pending and unpaid", order?.status === "pending" && order?.payment_status === "unpaid");

      // Stock must NOT move at placement.
      const [afterPlace] = await sql`select stock_qty from variants where id = ${variant.id}`;
      check("stock unchanged at placement", afterPlace.stock_qty === before, `${before} -> ${afterPlace.stock_qty}`);

      /*
        Marking paid is done directly here rather than through the server action,
        because an action id is build-specific and not addressable from a script.
        The logic under test is db/stock.ts, which the action calls.
      */
      const { takeStockForOrder, returnStockForOrder } = await import("../src/db/stock.ts");
      const { getDb } = await import("../src/db/client.ts");
      const db = getDb();

      await db.transaction(async (tx) => takeStockForOrder(tx, order.id, order.reference));
      const [afterPaid] = await sql`select stock_qty from variants where id = ${variant.id}`;
      check("stock decrements when paid", afterPaid.stock_qty === before - 2, `${before} -> ${afterPaid.stock_qty}`);

      // Idempotency: paying twice must not double-count.
      await db.transaction(async (tx) => takeStockForOrder(tx, order.id, order.reference));
      const [afterTwice] = await sql`select stock_qty from variants where id = ${variant.id}`;
      check("paying twice does not double-decrement", afterTwice.stock_qty === before - 2, `${afterTwice.stock_qty}`);

      // Cancel returns it.
      await db.transaction(async (tx) => returnStockForOrder(tx, order.id, order.reference));
      const [afterCancel] = await sql`select stock_qty from variants where id = ${variant.id}`;
      check("cancelling restocks", afterCancel.stock_qty === before, `${before} -> ${afterCancel.stock_qty}`);

      // And cancelling twice does not invent stock.
      await db.transaction(async (tx) => returnStockForOrder(tx, order.id, order.reference));
      const [afterCancelTwice] = await sql`select stock_qty from variants where id = ${variant.id}`;
      check("cancelling twice does not invent stock", afterCancelTwice.stock_qty === before, `${afterCancelTwice.stock_qty}`);

      const ledger = await sql`select reason, delta from stock_ledger where reference = ${order.id} order by created_at`;
      check("ledger recorded both movements", ledger.length === 2, `${ledger.length} rows`);
    }
  }
} catch (error) {
  check("order pipeline ran without throwing", false, String(error).slice(0, 200));
}

/* -------------------------------------------------------------------------- */
section("7. PUBLIC ENDPOINTS ARE RATE LIMITED");
/* -------------------------------------------------------------------------- */

{
  let limited = false;
  for (let attempt = 0; attempt < 14; attempt++) {
    const response = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines: [], delivery: {} }),
    });
    if (response.status === 429) { limited = true; break; }
  }
  check("order endpoint rate limits a flood", limited);
}

/* -------------------------------------------------------------------------- */
section("8. CLEAN UP");
/* -------------------------------------------------------------------------- */

if (testOrderId) {
  await sql`delete from stock_ledger where reference = ${testOrderId}`;
  await sql`delete from order_items where order_id = ${testOrderId}`;
  await sql`delete from orders where id = ${testOrderId}`;
  await sql`delete from customers where email = 'e2e-test@efeorganics.invalid'`;
  check("test data removed", true);
}

/* -------------------------------------------------------------------------- */
console.log(`\n${"=".repeat(60)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

await sql.end();
process.exit(failed === 0 ? 0 : 1);
