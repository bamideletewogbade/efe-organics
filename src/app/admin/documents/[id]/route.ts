import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { documents } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Serves an uploaded document.
 *
 * Sits under /admin deliberately, so `src/proxy.ts` already gates it: an
 * unauthenticated request is rewritten to the lock screen before this handler
 * runs. The session is checked again here anyway, because a route handler is a
 * public HTTP endpoint and "the middleware will have caught it" is the
 * assumption that leaks files.
 *
 * `Content-Disposition: inline` so a PDF opens in the browser rather than
 * downloading, with the filename quoted and stripped of anything that could
 * break the header.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.authenticated) {
    return new Response("Not authorised", { status: 401 });
  }

  const db = getDb();
  if (!db) return new Response("No database", { status: 503 });

  const { id } = await params;
  const [row] = await db.select().from(documents).where(eq(documents.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  const filename = row.name.replace(/["\\\r\n]/g, "").slice(0, 200);

  return new Response(new Uint8Array(row.content), {
    headers: {
      "content-type": row.mimeType,
      "content-length": String(row.sizeBytes),
      "content-disposition": `inline; filename="${filename}"`,
      // Never cached by a shared cache. These are business documents behind a
      // login, and a CDN copy would outlive the session that was allowed to see
      // it.
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
