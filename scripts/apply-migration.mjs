/**
 * Applies one migration file directly, statement by statement.
 *
 *   npx tsx --env-file=.env.local scripts/apply-migration.mjs 0004_acoustic_spirit
 *
 * WHY THIS EXISTS
 *
 * `drizzle-kit migrate` swallowed a real failure behind two harmless NOTICEs
 * and exited 1 with nothing useful printed, leaving the database missing two
 * tables and the admin returning a 500. Running the statements here shows
 * exactly which one fails and why.
 *
 * It also records the migration in drizzle's own table on success, so the
 * normal tooling stays in sync and does not try to re-apply it.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import postgres from "postgres";

const name = process.argv[2];
if (!name) {
  console.error("Usage: apply-migration.mjs <migration-name-without-.sql>");
  process.exit(1);
}

const path = `drizzle/${name}.sql`;
const content = readFileSync(path, "utf8");
const statements = content
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

console.log(`${path}: ${statements.length} statements\n`);

let applied = 0;
for (const [index, statement] of statements.entries()) {
  const label = statement.split("\n")[0].slice(0, 70);
  try {
    await sql.unsafe(statement);
    applied++;
    console.log(`  ok    ${index + 1}. ${label}`);
  } catch (error) {
    /*
      Already-exists is not a failure here.

      42P07 relation, 42710 type, 42701 column. All three mean the object is
      already in place, which happens for two reasons: re-running a migration
      that partially applied, and `drizzle-kit push` having created the object
      directly without recording a migration. The second is what happened to
      `orders.momo_reference`, and it is why this whole migration was failing:
      one duplicate column aborted the transaction and took two new tables with
      it, leaving /admin/stockists returning a 500.
    */
    const benign =
      error.code === "42P07" || error.code === "42710" || error.code === "42701";
    console.log(
      `  ${benign ? "skip " : "FAIL "} ${index + 1}. ${label}\n         ${error.code} ${error.message}`,
    );
    if (!benign) {
      await sql.end();
      process.exit(1);
    }
  }
}

/*
  Drizzle keys its journal on a hash of the file contents. Writing the row here
  means `drizzle-kit migrate` will not try this file again and the two tools
  stay in agreement about what has run.
*/
const hash = createHash("sha256").update(content).digest("hex");
const [existing] = await sql`
  select 1 from drizzle.__drizzle_migrations where hash = ${hash}
`;
if (!existing) {
  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${hash}, ${Date.now()})
  `;
  console.log("\nrecorded in drizzle.__drizzle_migrations");
}

console.log(`\n${applied}/${statements.length} statements applied`);
await sql.end();
