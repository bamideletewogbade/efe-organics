import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import type { Delimiter } from "@/lib/csv";
import { buildExport, EXPORTS, type ExportKind } from "@/lib/export";
import { logger } from "@/lib/logger";

/**
 * Downloads an export.
 *
 *   /admin/export/download?kind=orders
 *   /admin/export/download?kind=catalogue&delimiter=semicolon
 *
 * A route handler rather than a server action, because a server action cannot
 * return a file for the browser to save. This is one of the few places in the
 * App Router where the older primitive is simply the right one.
 *
 * IT LIVES UNDER /download, NOT AT /admin/export. A `route.ts` and a `page.tsx`
 * cannot occupy the same segment: Next refuses to build with "Conflicting route
 * and page". The export SCREEN is the page, this is the file it links to.
 *
 * IT SITS UNDER /admin ON PURPOSE. `proxy.ts` matches `/admin/:path*`, so this
 * is behind the same gate as every admin page and cannot be reached by an
 * unauthenticated request. The session is re-checked here anyway: a route
 * handler is a public endpoint and the middleware is not the only thing that
 * should be standing between a stranger and the customer list.
 */

const log = logger.child({ route: "admin/export" });

const DELIMITERS: Record<string, Delimiter> = {
  comma: ",",
  semicolon: ";",
  tab: "\t",
};

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as ExportKind | null;
  if (!kind || !(kind in EXPORTS)) {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 });
  }

  const delimiter = DELIMITERS[url.searchParams.get("delimiter") ?? "comma"] ?? ",";

  try {
    const body = await buildExport(kind, delimiter);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${EXPORTS[kind].filename}-${stamp}.csv`;

    log.info("export downloaded", { kind, by: session.actorEmail });

    return new NextResponse(body, {
      headers: {
        // `charset=utf-8` plus the BOM the writer adds: belt and braces for
        // Excel, which will otherwise mangle the cedi sign in every price.
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        // An export is a snapshot of live data and must never be served from a
        // cache, least of all a shared one holding somebody's customer list.
        "cache-control": "no-store, private",
      },
    });
  } catch (error) {
    log.error("export failed", { kind, error: String(error) });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
