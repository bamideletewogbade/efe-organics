import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit config — migration generation only.
 *
 * Migrations are generated into `drizzle/` and COMMITTED. `db:push` exists for
 * local iteration but must never touch production: pushing diffs the schema and
 * applies whatever it infers, which is how columns get silently dropped. A
 * reviewed SQL file in version control is the difference between a deploy you
 * can reason about and one you hope about.
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
