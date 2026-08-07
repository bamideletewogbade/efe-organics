import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";

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

  /*
    The sign-in route renders itself, unwrapped.

    Without this the layout's gate replaces the page beneath it, so Clerk's
    sign-in component is swapped for the legacy password form and signing in
    becomes impossible. The flag is set by middleware, which is the only layer
    that knows the pathname.
  */
  const isPublicAdminRoute =
    (await headers()).get("x-efe-admin-public") === "1";

  if (isPublicAdminRoute) {
    return <AdminShell>{children}</AdminShell>;
  }

  /**
   * Unauthenticated visitors or locked sessions get the standalone full-screen
   * sign-in interface without the admin sidebar.
   *
   * With Clerk configured this branch is mostly unreachable, because middleware
   * has already redirected a signed-out visitor. It still matters for the case
   * middleware CANNOT judge: signed in to Clerk, but not on Efe's allowlist.
   * That person holds a perfectly valid session and must still be refused, with
   * a message that says why rather than a login box they have already passed.
   */
  if (!session.authenticated) {
    return (
      <AdminShell>
        <AdminSignIn lockedReason={session.lockedReason} />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
    {/*
      `data-chrome="admin"` is what switches headings off the display face. A
      data attribute rather than a class so the rule in globals.css reads as a
      statement about the chrome rather than yet another utility to remember to
      apply, and so a stray `className` edit cannot quietly undo it.
    */}
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
    </AdminShell>
  );
}

/**
 * Wraps the admin in ClerkProvider, and ONLY the admin.
 *
 * The provider is not at the root layout on purpose. Clerk ships a client
 * runtime, and putting it there would load it on every product page and every
 * checkout for a shop where nothing outside /admin has a user account. Three
 * staff should not cost every shopper a JavaScript download.
 *
 * When Clerk is unconfigured this renders its children untouched, which is what
 * keeps the app building and running with an empty `.env.local`.
 */
function AdminShell({ children }: { children: React.ReactNode }) {
  if (!capabilities.hasClerk) return <>{children}</>;

  return (
    <ClerkProvider
      /*
        Clerk's components are themed to match the admin rather than left at
        their defaults, so signing in does not feel like leaving the product.
        The palette references Efe's own tokens.
      */
      /*
        Only variables this SDK version actually declares. `colorText` was in an
        earlier draft of this and is not a key in Clerk 7's `Variables` type, so
        it failed the typecheck rather than being silently ignored at runtime,
        which is the better of the two outcomes.
      */
      appearance={{
        variables: {
          colorPrimary: "#d98f14",
          colorBackground: "#0d2c1d",
          borderRadius: "0.75rem",
        },
      }}
      signInUrl="/admin/sign-in"
      signInFallbackRedirectUrl="/admin"
    >
      {children}
    </ClerkProvider>
  );
}
