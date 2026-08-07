import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

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
 * TWO GATES, ONE AT A TIME
 *
 * With Clerk configured, `clerkMiddleware` runs and `auth.protect()` bounces
 * anyone without a session to Clerk's sign-in. Without it, the original signed
 * cookie gate runs unchanged. The switch is the presence of the keys, so this
 * file is safe to deploy before anybody has pasted a secret anywhere.
 *
 * WHAT THIS LAYER DELIBERATELY DOES NOT DO
 *
 * It does not decide whether a signed-in person is an Efe admin. Clerk sign-up
 * is open, so a valid Clerk session proves identity and nothing else. The
 * allowlist check against `admin_users` needs a database and belongs in
 * `getAdminSession()`, which every page and every server action already calls.
 * Middleware narrows the crowd; authorisation is decided further in.
 */

/*
  Plain string checks, NOT `createRouteMatcher`.

  That helper is deprecated in Clerk 7 and its warning is worth quoting, because
  it is an argument about architecture rather than about an API:

    "Move auth checks into each page, layout, API route, or Server Function that
     accesses protected data. Middleware-based auth checks rely on path
     matching, which can diverge from how Next.js routes requests and leave
     protected resources reachable."

  That is correct, and this app already follows it: `getAdminSession()` runs in
  the admin layout, and every server action calls `assertAdmin()` independently
  because an action id is a public endpoint middleware never sees.

  So why keep a middleware check at all? Because of something measured on this
  codebase earlier: a layout that refuses to render `children` still receives
  them ALREADY RENDERED, so the page component executes and its data is
  serialised into the RSC payload. A gated /admin/orders was observed returning
  the orders table in its flight data while visibly displaying a lock screen.
  Middleware is the only layer that stops the work instead of hiding the result.

  The two are not alternatives. Middleware is the outer wall and the resource
  checks are the real lock, which is why the deprecated path-matching HELPER can
  go while the redirect stays.
*/
const isPublicAdminPath = (pathname: string) =>
  pathname.startsWith("/admin/sign-in") || pathname === "/admin/locked";

const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

/** The original gate: a signed cookie, verified at the edge. */
async function legacyGate(request: NextRequest) {
  const gate = await evaluateGate(
    request.cookies.get(ADMIN_COOKIE)?.value,
    process.env.NODE_ENV === "production",
  );

  if (gate === "open" || gate === "dev-bypass") {
    if (request.nextUrl.pathname === "/admin/locked") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl, {
        headers: { "cache-control": "no-store, private" },
      });
    }
    return NextResponse.next();
  }

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

const withClerk = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || isPublicAdminPath(pathname)) {
    return NextResponse.next();
  }

  const { isAuthenticated } = await auth();

  /*
    Redirect rather than rewrite, unlike the cookie gate. Clerk's sign-in needs
    a real page of its own to route its own sub-steps through, so the URL has to
    change. `redirect_url` carries where they were headed so they land there and
    not on a generic dashboard.

    This only answers "is there a Clerk session". Whether that person is an Efe
    admin is decided by the allowlist in getAdminSession, which needs a database
    and therefore cannot run here.
  */
  if (!isAuthenticated) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/admin/sign-in";
    signIn.search = "";
    signIn.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signIn, {
      headers: { "cache-control": "no-store, private" },
    });
  }

  return NextResponse.next({
    headers: { "cache-control": "no-store, private" },
  });
});

export async function proxy(request: NextRequest, event: never) {
  const { pathname } = request.nextUrl;

  /*
    Clerk's own traffic passes straight through.

    `/__clerk/*` is the auto-proxy path its client uses to reach Clerk's API
    through this origin rather than cross-site, which is what keeps the session
    cookie first-party. It has to be routed through clerkMiddleware and must
    never be treated as an admin page: gating it would break the sign-in flow
    that the gate depends on.
  */
  if (pathname.startsWith("/__clerk")) {
    return clerkConfigured ? withClerk(request, event) : NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  return clerkConfigured ? withClerk(request, event) : legacyGate(request);
}

/*
  Scoped to the admin plus Clerk's proxy path, NOT the whole site.

  Clerk's quickstart matcher covers every route, which is right for an app where
  the whole product is behind a login. Here it would run Clerk's middleware on
  every product page, category and checkout for a shop whose customers have no
  accounts at all. Narrow is both faster and a smaller surface.
*/
export const config = {
  matcher: ["/admin/:path*", "/__clerk/:path*"],
};
