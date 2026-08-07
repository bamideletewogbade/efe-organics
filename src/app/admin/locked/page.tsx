import { redirect } from "next/navigation";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { Wordmark } from "@/components/brand/Wordmark";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The gate's landing page.
 *
 * `proxy.ts` rewrites every unauthenticated /admin request here, so this is the
 * ONLY admin route an unauthenticated visitor can cause to render. It queries
 * nothing and imports nothing that touches the database, that is the whole
 * point, and it is what makes the leak impossible rather than merely hidden.
 */
export default async function AdminLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const session = await getAdminSession();
  if (session.authenticated) {
    redirect("/admin");
  }

  const { reason } = await searchParams;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-forest-deep">
      {reason === "locked" ? (
        <main className="flex min-h-svh items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-gold/20 bg-forest-deep p-8 text-center">
            <div className="flex justify-center">
              <Wordmark onDark />
            </div>
            <h1 className="mt-5 text-xl text-paper">Portal Unavailable</h1>
            <p className="mt-3 text-sm/6 text-paper/60">
              Access to this resource requires active system configuration.
            </p>
            <p className="mt-4 text-xs/5 text-paper/45">
              Please verify configuration credentials or contact your administrator.
            </p>
          </div>
        </main>
      ) : (
        <AdminSignIn />
      )}
    </div>
  );
}
