/**
 * End-to-end test of every admin-facing feature.
 *
 *   npx tsx --env-file=.env.local scripts/test-admin.mjs
 *   npx tsx --env-file=.env.local scripts/test-admin.mjs --base https://efeorganics.com
 *
 * WHY THIS IS NOT A SMOKE TEST
 *
 * "Every page returns 200" is nearly worthless on this admin: a gated route
 * returns 200 while rendering the lock screen, and an empty screen renders
 * perfectly whether the query works or the table is empty. So each check below
 * asserts on CONTENT, and the mutation tests assert against the database rather
 * than against what a page claims.
 *
 * THE DATABASE IS PRODUCTION, AND THAT SHAPES EVERYTHING
 *
 * Efe's live shop reads the same Neon instance. So:
 *
 *   - Every mutating test runs inside a transaction that is ROLLED BACK. The
 *     assertions run against real writes, and nothing survives.
 *   - Nothing here deletes or edits an existing row outside a rolled-back
 *     transaction.
 *   - Test rows are prefixed `zz-test-` so anything that ever does escape is
 *     obvious and sorts to the bottom.
 *
 * THE SESSION COOKIE IS FORGED, LEGITIMATELY
 *
 * Signing in over HTTP means finding a build-generated server action id, which
 * is brittle. Instead the test mints a cookie with the same HMAC the app uses.
 * That is not a shortcut around the gate: if the signing logic is wrong, the
 * forged cookie fails exactly as a real one would, which is itself a test.
 */

import postgres from "postgres";
import { eq, sql as raw } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../src/db/schema.ts";
import { hashPassword, verifyPassword, needsRehash } from "../src/lib/password.ts";
import { resolveDiscount } from "../src/lib/discounts.ts";
import { takeStockForOrder, returnStockForOrder } from "../src/db/stock.ts";
import { formatPrice } from "../src/lib/money.ts";

/* -------------------------------------------------------------------------- */
/* Harness                                                                    */
/* -------------------------------------------------------------------------- */

const BASE =
  process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : "http://localhost:3230";

let passed = 0;
let failed = 0;
const failures = [];
let group = "";

function section(name) {
  group = name;
  console.log(`\n${name}`);
  console.log("-".repeat(name.length));
}

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${group} / ${name}${detail ? `: ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? `  <-- ${detail}` : ""}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Session forging, using the app's own signing                               */
/* -------------------------------------------------------------------------- */

const SECRET =
  process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";

async function sign(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Buffer.from(signature).toString("base64url");
}

async function mintCookie({
  expiry = Date.now() + 60 * 60 * 1000,
  userId = "",
  email = "test@efeorganics.com",
  role = "owner",
} = {}) {
  const payload = [expiry, userId, email, role].join("|");
  return `efe_admin=${payload}.${await sign(payload)}`;
}

async function get(path, cookie) {
  const response = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return { status: response.status, body: await response.text() };
}

/* -------------------------------------------------------------------------- */

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 3 });
const db = drizzle(sql, { schema });

console.log(`Testing ${BASE}`);
console.log(`Database: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "?"}`);

/* ========================================================================== */
section("1. Password hashing");
/* ========================================================================== */
{
  const hash = await hashPassword("a correct horse battery staple");
  check("hash has the scrypt format with cost parameters", /^scrypt\$\d+\$\d+\$\d+\$/.test(hash));
  check("correct password verifies", await verifyPassword("a correct horse battery staple", hash));
  check("wrong password rejected", !(await verifyPassword("a correct horse battery stapl", hash)));
  check("empty password rejected", !(await verifyPassword("", hash)));
  check("null hash rejected", !(await verifyPassword("anything", null)));
  check("malformed hash rejected, does not throw", !(await verifyPassword("x", "not-a-hash")));
  check("current cost needs no rehash", !needsRehash(hash));
  check("weaker cost flagged for rehash", needsRehash("scrypt$16384$8$1$c2FsdA$aGFzaA"));

  const a = await hashPassword("same password");
  const b = await hashPassword("same password");
  check("same password gives different hashes, so salting works", a !== b);
}

/* ========================================================================== */
section("2. Session tokens");
/* ========================================================================== */
{
  check("a signing secret is configured", Boolean(SECRET), "ADMIN_SESSION_SECRET missing");

  const good = await mintCookie();
  const { status, body } = await get("/admin", good);
  check("valid session reaches the dashboard", status === 200 && !/Partner Portal|Sign in to your account/.test(body), `status ${status}`);

  const noCookie = await get("/admin");
  check("no cookie shows the sign-in screen", /Partner Portal|Sign in to your account/.test(noCookie.body));

  // Tamper: keep the signature, escalate the role in the payload.
  const tampered = (await mintCookie({ role: "staff" })).replace("|staff.", "|owner.");
  const tamperCheck = await get("/admin", tampered);
  check("role tampering is rejected", /Partner Portal|Sign in to your account/.test(tamperCheck.body));

  const expired = await mintCookie({ expiry: Date.now() - 1000 });
  const expiredCheck = await get("/admin", expired);
  check("expired session is rejected", /Partner Portal|Sign in to your account/.test(expiredCheck.body));

  const garbage = "efe_admin=totally.invalid";
  const garbageCheck = await get("/admin", garbage);
  check("garbage cookie is rejected", /Partner Portal|Sign in to your account/.test(garbageCheck.body));
}

/* ========================================================================== */
section("3. Every admin route, unauthenticated");
/* ========================================================================== */
const ROUTES = [
  "/admin",
  "/admin/orders",
  "/admin/products",
  "/admin/stock",
  "/admin/promotions",
  "/admin/customers",
  "/admin/analytics",
  "/admin/documents",
  "/admin/import",
  "/admin/export",
  "/admin/settings",
  "/admin/settings/users",
  "/admin/assistant",
  "/admin/search?q=soap",
  "/admin/marketing",
  "/admin/stockists",
  "/admin/products/new",
];
{
  // Real values from the live database that must never appear on a gated page.
  const [order] = await db
    .select({ reference: schema.orders.reference, phone: schema.orders.deliveryPhone })
    .from(schema.orders)
    .limit(1);

  for (const route of ROUTES) {
    const { body } = await get(route);
    const gated = /Partner Portal|Sign in to your account|Admin locked/.test(body);
    const leaked = order
      ? body.includes(order.reference) || (order.phone && body.includes(order.phone))
      : false;
    check(`${route} is gated and leaks nothing`, gated && !leaked, leaked ? "LEAKED ORDER DATA" : "not gated");
  }
}

/* ========================================================================== */
section("4. Every admin route, authenticated");
/* ========================================================================== */
{
  const cookie = await mintCookie();
  for (const route of ROUTES) {
    const { status, body } = await get(route, cookie);
    const errored =
      /Application error|couldn.{0,3}t load|Internal Server Error|digest.{0,4}\d{6}/i.test(body);
    const stillGated = /Partner Portal|Sign in to your account/.test(body);
    check(
      `${route} renders`,
      status === 200 && !errored && !stillGated,
      errored ? "runtime error" : stillGated ? "gated despite valid session" : `status ${status}`,
    );
  }
}

/* ========================================================================== */
section("5. Catalogue reads the database");
/* ========================================================================== */
{
  const cookie = await mintCookie();
  const [dbCount] = await db
    .select({ n: raw`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.status, "active"));

  const { body } = await get("/admin/products", cookie);
  check("products screen shows the live count", body.includes(String(dbCount.n)), `db says ${dbCount.n}`);

  const [variant] = await db
    .select({ slug: schema.variants.slug, price: schema.variants.priceMinor })
    .from(schema.variants)
    .limit(1);
  const shop = await get(`/shop/${variant.slug}`);
  check(
    "storefront shows the database price, not the static file",
    shop.body.includes(formatPrice(variant.price)),
    `expected ${formatPrice(variant.price)} for ${variant.slug}`,
  );
}

/* ========================================================================== */
section("6. Stock movement (rolled back)");
/* ========================================================================== */
{
  let result = {};
  try {
    await db.transaction(async (tx) => {
      const [variant] = await tx
        .select()
        .from(schema.variants)
        .where(eq(schema.variants.trackStock, true))
        .limit(1);

      const opening = variant.stockQty;

      const [order] = await tx
        .insert(schema.orders)
        .values({
          reference: "zz-test-stock",
          status: "pending",
          paymentStatus: "unpaid",
          subtotalMinor: variant.priceMinor * 2,
          totalMinor: variant.priceMinor * 2,
        })
        .returning({ id: schema.orders.id });

      await tx.insert(schema.orderItems).values({
        orderId: order.id,
        nameSnapshot: "zz-test item",
        slugSnapshot: variant.slug,
        unitPriceMinor: variant.priceMinor,
        quantity: 2,
        lineTotalMinor: variant.priceMinor * 2,
      });

      const take = await takeStockForOrder(tx, order.id, "zz-test-stock");
      const [afterTake] = await tx
        .select({ qty: schema.variants.stockQty })
        .from(schema.variants)
        .where(eq(schema.variants.id, variant.id));

      const takeAgain = await takeStockForOrder(tx, order.id, "zz-test-stock");
      const [afterTwice] = await tx
        .select({ qty: schema.variants.stockQty })
        .from(schema.variants)
        .where(eq(schema.variants.id, variant.id));

      const back = await returnStockForOrder(tx, order.id, "zz-test-stock");
      const [afterReturn] = await tx
        .select({ qty: schema.variants.stockQty })
        .from(schema.variants)
        .where(eq(schema.variants.id, variant.id));

      const backAgain = await returnStockForOrder(tx, order.id, "zz-test-stock");

      const [ledger] = await tx
        .select({ n: raw`count(*)::int` })
        .from(schema.stockLedger)
        .where(eq(schema.stockLedger.reference, order.id));

      result = {
        opening,
        afterTake: afterTake.qty,
        afterTwice: afterTwice.qty,
        afterReturn: afterReturn.qty,
        takeMoved: take.moved,
        takeAgainMoved: takeAgain.moved,
        backMoved: back.moved,
        backAgainMoved: backAgain.moved,
        ledgerRows: ledger.n,
      };

      // Roll everything back. Nothing above touches production.
      throw new Error("zz-test-rollback");
    });
  } catch (error) {
    if (error.message !== "zz-test-rollback") throw error;
  }

  check("marking paid takes stock", result.afterTake === result.opening - 2, `${result.opening} -> ${result.afterTake}`);
  check("taking stock reports it moved", result.takeMoved === true);
  check("taking twice is a no-op", result.afterTwice === result.afterTake, `${result.afterTake} -> ${result.afterTwice}`);
  check("second take reports nothing moved", result.takeAgainMoved === false);
  check("cancelling restores stock", result.afterReturn === result.opening, `back to ${result.afterReturn}, opened at ${result.opening}`);
  check("returning twice is a no-op", result.backAgainMoved === false);
  check("ledger recorded both directions", result.ledgerRows === 2, `${result.ledgerRows} rows`);
}

/* ========================================================================== */
section("7. Discounts (rolled back)");
/* ========================================================================== */
{
  let result = {};
  try {
    await db.transaction(async (tx) => {
      const lines = [{ slug: "zz-a", quantity: 1, lineTotalMinor: 10000 }];

      const none = await resolveDiscount(tx, { subtotalMinor: 10000, lines });

      await tx.insert(schema.discounts).values({
        name: "zz-test 20 percent",
        kind: "percentage",
        scope: "order",
        value: 20,
        active: true,
      });
      const percent = await resolveDiscount(tx, { subtotalMinor: 10000, lines });

      await tx.insert(schema.discounts).values({
        name: "zz-test flat 50",
        kind: "fixed_amount",
        scope: "order",
        value: 5000,
        active: true,
      });
      const best = await resolveDiscount(tx, { subtotalMinor: 10000, lines });

      await tx.insert(schema.discounts).values({
        name: "zz-test coded",
        kind: "percentage",
        scope: "order",
        value: 90,
        code: "ZZTEST90",
        active: true,
      });
      const withoutCode = await resolveDiscount(tx, { subtotalMinor: 10000, lines });
      const withCode = await resolveDiscount(tx, { subtotalMinor: 10000, lines, code: "zztest90" });

      await tx.insert(schema.discounts).values({
        name: "zz-test huge",
        kind: "fixed_amount",
        scope: "order",
        value: 999999,
        active: true,
      });
      const capped = await resolveDiscount(tx, { subtotalMinor: 10000, lines });

      const minimum = await resolveDiscount(tx, { subtotalMinor: 100, lines: [{ slug: "zz-a", quantity: 1, lineTotalMinor: 100 }] });

      result = {
        none,
        percentAmount: percent?.amountMinor,
        bestAmount: best?.amountMinor,
        withoutCodeAmount: withoutCode?.amountMinor,
        withCodeAmount: withCode?.amountMinor,
        cappedAmount: capped?.amountMinor,
        minimumAmount: minimum?.amountMinor,
      };
      throw new Error("zz-test-rollback");
    });
  } catch (error) {
    if (error.message !== "zz-test-rollback") throw error;
  }

  check("no active discount gives nothing", result.none === null);
  check("percentage applies correctly", result.percentAmount === 2000, `got ${result.percentAmount}, wanted 2000`);
  check("the larger of two discounts wins", result.bestAmount === 5000, `got ${result.bestAmount}`);
  check("a coded discount does not leak without the code", result.withoutCodeAmount === 5000, `got ${result.withoutCodeAmount}`);
  check("the code applies when given, case insensitively", result.withCodeAmount === 9000, `got ${result.withCodeAmount}`);
  check("a discount can never exceed the subtotal", result.cappedAmount === 10000, `got ${result.cappedAmount}`);
  check("a small basket cannot go negative", result.minimumAmount <= 100, `got ${result.minimumAmount}`);
}

/* ========================================================================== */
section("8. Money handling");
/* ========================================================================== */
{
  check("formats whole cedis", formatPrice(1500) === "GH₵15.00", formatPrice(1500));
  check("formats with pesewas", formatPrice(1599) === "GH₵15.99", formatPrice(1599));
  check("formats zero", formatPrice(0) === "GH₵0.00", formatPrice(0));
  check("formats thousands with a separator", formatPrice(1375000).includes(","), formatPrice(1375000));

  // The reason money is stored as integers at all.
  const naive = 0.1 + 0.2;
  check("integer pesewas avoid float drift", 10 + 20 === 30 && naive !== 0.3);
}

/* ========================================================================== */
section("9. Data integrity");
/* ========================================================================== */
{
  const [orphanVariants] = await db.select({ n: raw`count(*)::int` }).from(schema.variants)
    .where(raw`product_id not in (select id from products)`);
  check("no variants without a product", orphanVariants.n === 0, `${orphanVariants.n} orphans`);

  const [negative] = await db.select({ n: raw`count(*)::int` }).from(schema.variants)
    .where(raw`stock_qty < 0`);
  check("no negative stock", negative.n === 0, `${negative.n} negative`);

  const [badPrice] = await db.select({ n: raw`count(*)::int` }).from(schema.variants)
    .where(raw`price_minor <= 0`);
  check("no zero or negative prices", badPrice.n === 0, `${badPrice.n} bad`);

  const [badTotals] = await db.select({ n: raw`count(*)::int` }).from(schema.orders)
    .where(raw`total_minor <> subtotal_minor - discount_minor + coalesce(delivery_minor,0) + coalesce(tax_minor,0)`);
  check("every order total adds up", badTotals.n === 0, `${badTotals.n} orders do not reconcile`);

  const [testRows] = await db.select({ n: raw`count(*)::int` }).from(schema.orders)
    .where(raw`reference like 'zz-test%'`);
  check("no test data leaked into production", testRows.n === 0, `${testRows.n} test rows found`);
}

/* ========================================================================== */

console.log(`\n${"=".repeat(60)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log("\nFAILURES");
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

await sql.end();
process.exit(failed === 0 ? 0 : 1);
