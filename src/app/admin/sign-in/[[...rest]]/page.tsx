import { SignIn } from "@clerk/nextjs";

import { Wordmark } from "@/components/brand/Wordmark";
import { capabilities } from "@/lib/env";
import { AdminSignIn } from "@/components/admin/AdminSignIn";

export const metadata = { title: "Sign in" };

/**
 * The admin sign-in page.
 *
 * WHY THE FOLDER IS `[[...rest]]`
 *
 * Clerk's `<SignIn />` is not one screen. It routes internally through its own
 * sub-paths for factor-two, password reset, SSO callbacks and verification, and
 * it needs to own everything under this segment to do that. An optional
 * catch-all is what gives it that; a plain `page.tsx` renders the first step and
 * then 404s the moment anyone clicks "forgot password", which is exactly the
 * feature this migration is meant to deliver.
 *
 * The legacy form is still rendered when Clerk is unconfigured, so this route
 * is never a dead end during the switchover.
 */
export default function AdminSignInPage() {
  if (!capabilities.hasClerk) return <AdminSignIn />;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-forest-deep p-6">
      {/*
        The mark sits above Clerk's card rather than inside it. Clerk's own logo
        slot is small and centred in a component we do not control the internals
        of; giving the brand its own space means the page still looks like Efe
        even if Clerk changes its layout.
      */}
      <Wordmark onDark size="large" />

      <SignIn
        // Where Clerk sends someone once they are authenticated. The allowlist
        // check happens after this, in getAdminSession, so landing here does
        // not imply access was granted.
        fallbackRedirectUrl="/admin"
        appearance={{
          elements: {
            // Clerk offers sign-up links by default. There is no self-service
            // sign-up for a shop's back office: accounts are created by an
            // owner, so the link would lead somewhere that cannot help.
            footerAction: { display: "none" },
          },
        }}
      />

      <p className="max-w-xs text-center text-[0.68rem]/5 text-paper/40">
        Access is granted by an Efe owner. Signing in does not by itself give
        access to the back office.
      </p>
    </main>
  );
}
