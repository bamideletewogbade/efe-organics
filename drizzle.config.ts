import { readFileSync } from "node:fs";

import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit config, migration generation only.
 *
 * Migrations are generated into `drizzle/` and COMMITTED. `db:push` exists for
 * local iteration but must never touch production: pushing diffs the schema and
 * applies whatever it infers, which is how columns get silently dropped. A
 * reviewed SQL file in version control is the difference between a deploy you
 * can reason about and one you hope about.
 *
 * `.env.local` IS READ MANUALLY.
 *
 * drizzle-kit does not load Next's env files, so `drizzle-kit migrate` saw an
 * empty `DATABASE_URL` and refused to run even though the app was configured.
 * The alternative is remembering to prefix every invocation with the connection
 * string, which is how a production URL ends up in a shell history file.
 */
function loadLocalEnv(): void {
  if (process.env.DATABASE_URL) return;
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local. Fine in CI, where the variable is set directly.
  }
}

loadLocalEnv();

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
