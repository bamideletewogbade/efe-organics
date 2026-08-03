import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Database connection.
 *
 * **Returns null when `DATABASE_URL` is absent, and that is deliberate.** The
 * house rule is that the app must run, build and demo with an empty
 * `.env.local`. So the catalogue falls back to the committed static file and
 * the site keeps working. Throwing on a missing connection string would make
 * the whole project undemoable the moment the database is unreachable, which is
 * exactly when you most want to show it to someone.
 *
 * Callers use `getDb()` and branch on null, or `requireDb()` where a database
 * genuinely is the point (admin writes, order placement).
 *
 * The client is cached on `globalThis` because Next's dev server re-evaluates
 * modules on every hot reload, without this you exhaust the connection pool
 * after a few dozen saves.
 */

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * A Drizzle transaction handle, derived rather than hand-written.
 *
 * Helpers that write must run inside the caller's transaction, not open their
 * own, or a partial failure leaves an order committed with no matching stock
 * movement. Typing them against `Db | Tx` lets the same function be called
 * either way and keeps the alternative (`any` with a lint suppression at every
 * call site) out of the codebase.
 */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Anything that can run queries: the pool, or a transaction inside it. */
export type Executor = Db | Tx;

const globalForDb = globalThis as unknown as {
  __efeDb?: Db | null;
  __efeSql?: ReturnType<typeof postgres>;
};

export function getDb(): Db | null {
  if (globalForDb.__efeDb !== undefined) return globalForDb.__efeDb;

  const url = env.server.databaseUrl;
  if (!url) {
    globalForDb.__efeDb = null;
    return null;
  }

  const sql = postgres(url, {
    // Serverless-friendly: many short-lived invocations, not one long process.
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  globalForDb.__efeSql = sql;
  globalForDb.__efeDb = drizzle(sql, { schema });
  return globalForDb.__efeDb;
}

/** For code paths where a database is the whole point. */
export function requireDb(): Db {
  const db = getDb();
  if (!db) {
    throw new Error(
      "DATABASE_URL is not set. The admin and order writes require a database; " +
        "the public catalogue falls back to the static file, but this path cannot.",
    );
  }
  return db;
}

export { schema };
