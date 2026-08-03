import { PageHeader } from "@/components/admin/AdminUI";
import { getFunnel, getTopProducts, getRecentAudit } from "@/db/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

/**
 * Analytics.
 *
 * The funnel counts **sessions that reached each step**, not raw events. One
 * indecisive shopper adding the same bar five times would otherwise look like
 * five people, and every conversion rate below it would be fiction.
 *
 * Drop-off is shown between steps rather than only conversion-to-top, because
 * "where do people leave" is the question worth acting on.
 */
export default async function AdminAnalyticsPage() {
  const [funnel, topProducts, audit] = await Promise.all([
    getFunnel(7),
    getTopProducts(7),
    getRecentAudit(12),
  ]);

  const top = funnel[0]?.sessions ?? 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="The last 7 days, measured on your own site. No third-party trackers, and no data leaving your database."
        meta={top > 0 ? `${top} visitors this week` : undefined}
      />

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.3fr_1fr]">
        {/* ---- funnel ---- */}
        <section>
          <h2 className="text-lg">How far people get</h2>

          {top === 0 ? (
            <p className="mt-4 rounded-2xl border border-line bg-surface-sunken p-6 text-sm text-muted">
              No visits recorded yet. Events start flowing once a database is
              connected and someone browses the shop.
            </p>
          ) : (
            <ol className="mt-4 grid gap-2">
              {funnel.map((step, index) => {
                const share = top > 0 ? (step.sessions / top) * 100 : 0;
                const previous = index > 0 ? funnel[index - 1].sessions : null;
                const dropped =
                  previous !== null && previous > 0
                    ? Math.round(((previous - step.sessions) / previous) * 100)
                    : null;

                return (
                  <li
                    key={step.name}
                    className="rounded-xl border border-line bg-surface-raised p-4"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-medium text-strong">
                        {step.label}
                      </span>
                      <span className="stat text-sm text-strong">
                        {step.sessions}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {share.toFixed(0)}%
                        </span>
                      </span>
                    </div>

                    <div
                      className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.max(share, 1)}%` }}
                      />
                    </div>

                    {dropped !== null && dropped > 0 && (
                      <p className="mt-1.5 text-xs text-muted">
                        {dropped}% dropped off here
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* ---- top products ---- */}
        <section>
          <h2 className="text-lg">Most viewed</h2>
          <ul className="mt-4 grid gap-2">
            {topProducts.length === 0 && (
              <li className="rounded-xl border border-line bg-surface-raised p-4 text-sm text-muted">
                Nothing yet.
              </li>
            )}
            {topProducts.map((product, index) => (
              <li
                key={product.slug}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-3.5"
              >
                <span className="stat w-6 text-sm text-muted">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-strong">
                  {product.name}
                </span>
                <span className="stat text-sm text-muted">{product.views}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg">Recent changes</h2>
          <ul className="mt-4 grid gap-1.5">
            {audit.length === 0 && (
              <li className="rounded-xl border border-line bg-surface-raised p-4 text-sm text-muted">
                No admin activity recorded yet.
              </li>
            )}
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-line bg-surface-raised px-3.5 py-2.5 text-xs"
              >
                <span className="font-medium text-strong">{entry.action}</span>
                <span className="text-muted">
                  {" "}
                  · {entry.entity} ·{" "}
                  {new Date(entry.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
