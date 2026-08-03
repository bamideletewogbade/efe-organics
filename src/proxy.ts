import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, evaluateGate } from "@/lib/admin-token";

/**
 * Next 16 middleware. Note the filename: `proxy.ts`, not `middleware.ts`.
 *
 * THIS IS THE ADMIN GATE. It exists because a layout guard is not one.
 *
 * The first version of this admin checked the session inside `admin/layout.tsx`
 * and rendered a lock screen instead of `children`. That looked right and was
 * wrong: in the App Router the layout receives children as an ALREADY-RENDERED
 * node, so the page component executes and its output is serialised into the
 * RSC payload regardless of what the layout decides to display. Fetching a
 * "locked" /admin/orders returned a page that visibly said "Admin locked" while
 * carrying the orders table in its flight data, with a live database that is
 * customer names and order totals shipped to an unauthenticated request.
 *
 * Middleware runs BEFORE any of that. It is the only layer that can stop the
 * work from happening rather than hide the result.
 *
 * The layout check stays as defence in depth, and every server action re-checks
 * independently. An action id is a public endpoint and middleware does not
 * cover a direct POST to one.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const gate = await evaluateGate(
    request.cookies.get(ADMIN_COOKIE)?.value,
    process.env.NODE_ENV === "production",
  );

  if (gate === "open" || gate === "dev-bypass") return NextResponse.next();

  // Rewrite, not redirect: the URL the admin typed stays in the bar so signing
  // in returns them where they were, and no admin path is leaked in a redirect
  // chain. `/admin/locked` renders the sign-in or the misconfiguration notice
  // and never touches the database.
  const url = request.nextUrl.clone();
  url.pathname = "/admin/locked";
  url.searchParams.set("reason", gate);

  return NextResponse.rewrite(url, {
    // A gated page must never be cached by a CDN and served to someone else.
    headers: { "cache-control": "no-store, private" },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
