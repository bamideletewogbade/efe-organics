/**
 * Quick read of what is actually in the database.
 *
 *   npx tsx --env-file=.env.local scripts/db-check.mjs
 *
 * Exists because a dashboard showing zeros has two possible causes, an empty
 * database or a broken query, and guessing between them wastes more time than
 * asking Postgres directly.
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const counts = await sql`
  select
    (select count(*) from products)      as products,
    (select count(*) from variants)      as variants,
    (select count(*) from categories)    as categories,
    (select count(*) from product_images) as images,
    (select count(*) from orders)        as orders,
    (select count(*) from admin_users)   as admins,
    (select count(*) from discounts)     as discounts
`;
console.log("row counts:", counts[0]);

const stock = await sql`
  select
    count(*)                                          as total,
    count(*) filter (where track_stock)                as tracked,
    count(*) filter (where stock_qty > 0)              as with_stock,
    coalesce(sum(stock_qty), 0)                        as units,
    coalesce(sum(price_minor * greatest(stock_qty,0)),0) as retail_value
  from variants
`;
console.log("stock:", stock[0]);

const sample = await sql`
  select p.name, v.size_label, v.price_minor, v.stock_qty, v.track_stock
  from variants v join products p on p.id = v.product_id
  order by v.price_minor asc limit 5
`;
console.table(sample);

await sql.end();
