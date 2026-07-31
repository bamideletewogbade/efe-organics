import { AdminSignIn } from "@/components/admin/AdminSignIn";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The gate's landing page.
 *
 * `proxy.ts` rewrites every unauthenticated /admin request here, so this is the
 * ONLY admin route an unauthenticated visitor can cause to render. It queries
 * nothing and imports nothing that touches the database — that is the whole
 * point, and it is what makes the leak impossible rather than merely hidden.
 */
export default async function AdminLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  if (reason === "locked") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-forest-deep p-6">
        <div className="max-w-md rounded-2xl border border-gold/20 bg-forest-deep p-8 text-center">
          <h1 className="text-xl text-paper">Admin locked</h1>
          <p className="mt-3 text-sm/6 text-paper/60">
            No <code className="text-gold">ADMIN_PASSWORD</code> is configured,
            so the admin refuses to open in production.
          </p>
          <p className="mt-4 text-xs/5 text-paper/45">
            Set it in the deployment environment and redeploy. Missing
            configuration fails closed on purpose — an admin that opens itself
            when unconfigured is how back offices end up indexed.
          </p>
        </div>
      </main>
    );
  }

  return <AdminSignIn />;
}
