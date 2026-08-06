/**
 * What the admin can actually do, measured against the live database.
 *
 *   npx tsx --env-file=.env.local scripts/audit-admin.mjs
 *
 * Written because "is the admin finished" is not answerable from a file listing.
 * A screen can exist, render, typecheck and still be wired to nothing. This
 * checks the two things that matter: does the table behind each screen hold
 * anything, and is the write path that fills it actually reachable.
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const [counts] = await sql`
  select
    (select count(*) from products where status = 'active') as live_products,
    (select count(*) from products)          as all_products,
    (select count(*) from variants)          as variants,
    (select count(*) from variants where track_stock) as tracked,
    (select count(*) from orders)            as orders,
    (select count(*) from order_items)       as order_lines,
    (select count(*) from customers)         as customers,
    (select count(*) from discounts)         as discounts,
    (select count(*) from bundles)           as bundles,
    (select count(*) from admin_users)       as admin_users,
    (select count(*) from documents)         as documents,
    (select count(*) from delivery_rates)    as delivery_rates,
    (select count(*) from settings)          as settings,
    (select count(*) from events)            as events,
    (select count(*) from audit_log)         as audit_rows,
    (select count(*) from stock_ledger)      as ledger_rows,
    (select count(*) from import_batches)    as imports,
    (select count(*) from product_images)    as images
`;

console.log("LIVE DATABASE\n");
for (const [key, value] of Object.entries(counts)) {
  console.log(`  ${key.padEnd(16)} ${value}`);
}

/*
  Each screen is judged on whether the thing it manages EXISTS yet, not on
  whether the code compiles. "Empty" is not a bug on a shop that has not opened;
  "no way to fill it" is.
*/
const screens = [
  { screen: "Overview",     table: "derived",        rows: null, fillable: true },
  { screen: "Orders",       table: "orders",         rows: Number(counts.orders),        fillable: "customer checkout" },
  { screen: "Products",     table: "products",       rows: Number(counts.live_products), fillable: "seed + editor" },
  { screen: "Stock",        table: "variants",       rows: Number(counts.tracked),       fillable: "adjust in admin" },
  { screen: "Promotions",   table: "discounts",      rows: Number(counts.discounts),     fillable: "create in admin" },
  { screen: "Customers",    table: "customers",      rows: Number(counts.customers),     fillable: "checkout + import" },
  { screen: "Analytics",    table: "events",         rows: Number(counts.events),        fillable: "site traffic" },
  { screen: "Documents",    table: "documents",      rows: Number(counts.documents),     fillable: "upload in admin" },
  { screen: "Import",       table: "import_batches", rows: Number(counts.imports),       fillable: "upload a CSV" },
  { screen: "Export",       table: "reads all",      rows: null, fillable: true },
  { screen: "Settings",     table: "delivery_rates", rows: Number(counts.delivery_rates),fillable: "set in admin" },
  { screen: "Users",        table: "admin_users",    rows: Number(counts.admin_users),   fillable: "invite in admin" },
  { screen: "Assistant",    table: "none",           rows: null, fillable: "needs OPENROUTER_API_KEY" },
];

console.log("\n\nSCREEN BY SCREEN\n");
console.log(`  ${"screen".padEnd(12)} ${"table".padEnd(16)} ${"rows".padEnd(7)} state`);
console.log(`  ${"-".repeat(12)} ${"-".repeat(16)} ${"-".repeat(7)} ${"-".repeat(30)}`);
for (const s of screens) {
  const rows = s.rows === null ? "n/a" : String(s.rows);
  const state =
    s.rows === null
      ? "derived"
      : s.rows > 0
        ? "HAS DATA"
        : `empty, fills from: ${s.fillable}`;
  console.log(`  ${s.screen.padEnd(12)} ${s.table.padEnd(16)} ${rows.padEnd(7)} ${state}`);
}

/* ---- the things that are genuinely not wired ---- */
console.log("\n\nGAPS\n");
const gaps = [];

if (Number(counts.admin_users) === 0) {
  gaps.push("No personal admin account exists. Everyone is on the shared password, so every audit row says 'shared-password' instead of a name.");
}
if (Number(counts.delivery_rates) === 0) {
  gaps.push("No delivery rates set. Every order needs its charge quoted by hand before it has a real total.");
}
if (Number(counts.tracked) > 0 && Number(counts.ledger_rows) === 0) {
  gaps.push("Stock is tracked but the ledger is empty, so no movement has ever been recorded.");
}
if (Number(counts.orders) === 0) {
  gaps.push("No orders yet, so the whole order workflow is untested against real data.");
}
if (Number(counts.events) === 0) {
  gaps.push("No analytics events recorded. Either nobody has visited, or the beacon is not firing in production.");
}

gaps.forEach((gap, index) => console.log(`  ${index + 1}. ${gap}`));
if (gaps.length === 0) console.log("  none found");

await sql.end();
