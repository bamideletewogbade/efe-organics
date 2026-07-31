import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/db/client";
import { AdminSignIn } from "@/components/admin/AdminSignIn";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Efe Admin" },
  // A shop's back office has no business in a search index.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Admin shell.
 *
 * Its own layout, deliberately outside the storefront chrome: no marketing
 * header, no cart, no theme toggle. This is a tool, and dressing a tool as a
 * shop makes both worse.
 *
 * The gate is here rather than in each page, so a new admin screen is protected
 * by existing. Forgetting the guard on one route is how back offices leak, and
 * "remember to add the check" is not a security model.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  const dbReady = getDb() !== null;

  /**
   * Defence in depth ONLY. The real gate is `src/proxy.ts`, which rewrites
   * unauthenticated requests to /admin/locked before any page renders — a
   * layout cannot prevent its children from executing, so a check here alone
   * would leak the rendered page in the RSC payload. See proxy.ts for the
   * full account of that bug.
   *
   * This branch should be unreachable in normal operation; it exists so that a
   * misconfigured matcher fails closed rather than open.
   */
  if (!session.authenticated) return <AdminSignIn />;

  return (
    <div className="flex min-h-svh flex-col bg-surface lg:flex-row">
      <AdminNav devBypass={session.devBypass} />

      <main className="min-w-0 flex-1">
        {!dbReady && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3">
            <p className="text-sm text-strong">
              <span className="font-semibold">No database connected.</span>{" "}
              Screens will render empty until{" "}
              <code className="text-xs">DATABASE_URL</code> is set and{" "}
              <code className="text-xs">npm run db:migrate</code> has run.
            </p>
          </div>
        )}

        {session.devBypass && (
          <div className="border-b border-line bg-surface-sunken px-6 py-2.5">
            <p className="text-xs text-muted">
              Development mode — no <code>ADMIN_PASSWORD</code> set, so this
              admin is unprotected. It locks itself in production.{" "}
              <Link href="/" className="underline underline-offset-4">
                Back to shop
              </Link>
            </p>
          </div>
        )}

        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
