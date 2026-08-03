/**
 * Switches stock tracking on and sets an opening count.
 *
 *   npx tsx --env-file=.env.local scripts/set-opening-stock.mjs --qty 25
 *   npx tsx --env-file=.env.local scripts/set-opening-stock.mjs --qty 25 --dry
 *
 * WHY THIS IS A SCRIPT AND NOT PART OF THE SEED
 *
 * The imported catalogue carries an in-stock boolean and no quantities, so the
 * seed leaves `track_stock` false on every variant rather than inventing counts
 * for a real business. That is the honest default and it means the whole stock
 * system sits inert until somebody decides otherwise.
 *
 * This is the deliberate act of deciding otherwise. It is useful for getting a
 * working shop to demo, and the number it sets is a placeholder that should be
 * replaced by a real count of the shelf before launch.
 *
 * Every change goes through the ledger, the same rule the admin follows, so the
 * opening balance is an auditable movement rather than a silent write.
 */
import postgres from "postgres";

const args = process.argv.slice(2);
const qtyIndex = args.indexOf("--qty");
const QTY = qtyIndex >= 0 ? Number(args[qtyIndex + 1]) : 25;
const DRY = args.includes("--dry");

if (!Number.isFinite(QTY) || QTY < 0) {
  console.error("--qty must be a number of zero or more");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const [before] = await sql`
  select count(*) filter (where track_stock) as tracked,
         count(*)                            as total
  from variants where archived_at is null
`;
console.log(`variants: ${before.total}, currently tracked: ${before.tracked}`);

if (DRY) {
  console.log(`dry run: would set track_stock = true and stock_qty = ${QTY}`);
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  const rows = await tx`
    select id, stock_qty from variants where archived_at is null
  `;

  for (const row of rows) {
    const delta = QTY - row.stock_qty;
    if (delta !== 0) {
      await tx`
        insert into stock_ledger (variant_id, delta, reason, note)
        values (${row.id}, ${delta}, 'manual_adjustment', 'Opening balance set by script')
      `;
    }
  }

  await tx`
    update variants
       set track_stock = true,
           stock_qty   = ${QTY},
           updated_at  = now()
     where archived_at is null
  `;
});

const [after] = await sql`
  select count(*) filter (where track_stock)              as tracked,
         coalesce(sum(stock_qty), 0)                       as units,
         coalesce(sum(price_minor * greatest(stock_qty,0)),0) as retail_value
  from variants where archived_at is null
`;

console.log(
  `now tracked: ${after.tracked}, units: ${after.units}, retail value: GH₵${(Number(after.retail_value) / 100).toFixed(2)}`,
);
console.log("\nThis is a placeholder. Count the real shelf before launch.");

await sql.end();
