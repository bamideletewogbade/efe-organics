import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAiDrawer } from "@/components/admin/AdminAiDrawer";
import { askShopAction } from "@/app/admin/ai-actions";
import { capabilities } from "@/lib/env";
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
   * Unauthenticated visitors or locked sessions get the standalone full-screen
   * sign-in interface without the admin sidebar.
   */
  if (!session.authenticated) {
    return <AdminSignIn />;
  }

  return (
    /*
      `data-chrome="admin"` is what switches headings off the display face. A
      data attribute rather than a class so the rule in globals.css reads as a
      statement about the chrome rather than yet another utility to remember to
      apply, and so a stray `className` edit cannot quietly undo it.
    */
    <div
      data-chrome="admin"
      className="flex min-h-svh flex-col bg-surface lg:flex-row"
    >
      <AdminNav devBypass={session.devBypass} dbReady={dbReady} />

      <main className="min-w-0 flex-1 relative">
        {/*
          The environment warnings moved into the sidebar. They were two stacked
          full-width bars, roughly 100px on every load, repeating what the
          operator already knew and pushing the actual work below the fold.
          Mobile has no sidebar footer, so they still appear here on small
          screens where vertical space is cheaper than a missing warning.
        */}
        {!dbReady && (
          <div className="border-b border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_10%,transparent)] px-6 py-3 lg:hidden">
            <p className="text-sm text-strong">
              <span className="font-semibold">No database connected.</span>{" "}
              Screens stay empty until <code>DATABASE_URL</code> is set.
            </p>
          </div>
        )}

        {session.devBypass && (
          <div className="border-b border-line bg-surface-sunken px-6 py-2.5 lg:hidden">
            <p className="text-xs text-muted">
              No <code>ADMIN_PASSWORD</code> set, so this admin is unprotected.{" "}
              <Link href="/" className="underline underline-offset-4">
                Back to shop
              </Link>
            </p>
          </div>
        )}

        <div className="p-6 lg:p-8">{children}</div>

        {/* Global floating AI Copilot Drawer */}
        <AdminAiDrawer askAction={askShopAction} hasAi={capabilities.hasAI} />
      </main>
    </div>
  );
}
