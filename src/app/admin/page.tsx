import Link from "next/link";

import { ButtonLink, Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import {
  HealthBar,
  Pipeline,
  RankedBars,
} from "@/components/admin/Sparkline";
import { InteractiveChart } from "@/components/admin/InteractiveChart";
import { getDashboardDetail, getDashboardSummary } from "@/db/queries/admin";
import { capabilities } from "@/lib/env";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * The stages worth showing, in the order the work actually happens.
 *
 * `cancelled` and `refunded` are left out on purpose. They are outcomes, not
 * stages, and putting them in a pipeline invites reading them as a step every
 * order passes through.
 */
const PIPELINE_STAGES = [
  { status: "pending", label: "Waiting", tone: "warn" as const },
  { status: "confirmed", label: "Confirmed", tone: "info" as const },
  { status: "paid", label: "Paid", tone: "info" as const },
  { status: "packed", label: "Packed", tone: "info" as const },
  { status: "shipped", label: "Shipped", tone: "info" as const },
  { status: "delivered", label: "Delivered", tone: "good" as const },
];

/**
 * Overview.
 *
 * WHAT WAS WRONG WITH THE OLD ONE
 *
 * Eleven numbers in two grids. On a shop that has not sold anything yet, nine
 * of them are zero, so the screen meant to tell you how the business is doing
 * said "0" nine times and looked broken while working perfectly. It also gave
 * equal visual weight to "orders waiting", which needs action this morning, and
 * "bundles running", which does not.
 *
 * THE RULES THIS IS BUILT ON
 *
 * 1. **Answer questions, do not report fields.** Each block answers something
 *    somebody actually opens a back office to ask: is anything waiting on me,
 *    are we selling, am I about to run out, what changed. A number that answers
 *    no question is not on this page.
 *
 * 2. **Needs-action outranks nice-to-know.** The attention row comes first and
 *    only appears when something is genuinely waiting. Nothing to do gives a
 *    calm screen that says so, rather than three zeroes.
 *
 * 3. **Say something true on day one.** Sales are empty until the shop opens,
 *    but the catalogue is real immediately: 42 sellable sizes, what they are
 *    worth, which are short. So this leads with what exists rather than with
 *    what has not happened yet.
 *
 * 4. **Name the thing, do not count it.** "3 running low" is a number you then
 *    have to go and investigate. Listing the three products with their counts
 *    is the job already half done.
 */
export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: rawDays } = await searchParams;
  const daysNum = [7, 14, 30, 90].includes(Number(rawDays)) ? Number(rawDays) : 14;

  const [s, detail] = await Promise.all([
    getDashboardSummary(),
    getDashboardDetail(daysNum),
  ]);

  const attention = [
    {
      label: "Orders waiting",
      value: s.pendingOrders,
      href: "/admin/orders",
      hint: "Confirm delivery, then take payment",
      tone: "warn" as const,
    },
    {
      label: "Out of stock",
      value: s.outOfStock,
      href: "/admin/stock",
      hint: "Customers cannot buy these",
      tone: "bad" as const,
    },
    {
      label: "Running low",
      value: s.lowStock,
      href: "/admin/stock",
      hint: "Worth restocking soon",
      tone: "warn" as const,
    },
  ];
  const needsAction = attention.filter((item) => item.value > 0);

  const ordersInWindow = detail.daily.reduce((sum, d) => sum + d.orders, 0);
  const revenueInWindow = detail.daily.reduce(
    (sum, d) => sum + d.revenueMinor,
    0,
  );
  const aovMinor = ordersInWindow > 0 ? Math.round(revenueInWindow / ordersInWindow) : 0;

  /*
    Live checklist, not a static list of instructions. Steps disappear as they
    are done, so it shrinks to nothing instead of permanently telling somebody
    to do things they finished weeks ago.
  */
  const setup = [
    {
      done: s.configured,
      label: "Connect a database",
      detail: "Orders, stock and customers need somewhere to live",
      href: null,
    },
    {
      done: s.productCount > 0,
      label: "Load the catalogue",
      detail: "Run npm run db:seed",
      href: "/admin/products",
    },
    {
      done: capabilities.hasOwnerWhatsapp || capabilities.hasEmail,
      label: "Choose where new orders are announced",
      detail: "Set OWNER_WHATSAPP, or verify a sending domain in Resend",
      href: "/admin/settings",
    },
    {
      done: capabilities.hasPaystack,
      label: "Connect Paystack",
      detail: "Until then, orders are reservations confirmed by phone",
      href: "/admin/settings",
    },
  ];
  const remaining = setup.filter((step) => !step.done);

  return (
    <div>
      <PageHeader
        title="Overview"
        description={
          needsAction.length > 0
            ? "Start with anything waiting on you."
            : "Nothing is waiting. Here is how the shop is doing."
        }
        action={<ButtonLink href="/admin/orders">Go to orders</ButtonLink>}
      />

      {/* ---- what needs you ---- */}
      {needsAction.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {needsAction.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-2xl border border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_7%,transparent)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-20px_rgb(20_67_44_/_0.5)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted">{item.label}</p>
                <Pill tone={item.tone}>Needs you</Pill>
              </div>
              <p className="stat mt-2 text-3xl text-[var(--progress)]">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--live)_30%,transparent)] bg-[color-mix(in_oklab,var(--live)_6%,transparent)] px-5 py-4">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--live)_16%,transparent)] text-[var(--live)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 12.5 5 5L20 6.5" />
            </svg>
          </span>
          <p className="text-sm text-strong">
            All clear. No orders waiting, nothing out of stock.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ---- trade ---- */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-strong">Sales & Performance</h2>
                <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-sunken p-1">
                  {[7, 14, 30, 90].map((d) => (
                    <Link
                      key={d}
                      href={`/admin?days=${d}`}
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors ${
                        daysNum === d
                          ? "bg-forest text-paper shadow-sm"
                          : "text-muted hover:text-strong"
                      }`}
                    >
                      {d}D
                    </Link>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">
                Showing data for the last {daysNum} days.
              </p>
            </div>

            <div className="flex gap-5 text-right">
              <div>
                <p className="stat text-xl text-strong">{ordersInWindow}</p>
                <p className="text-[0.68rem] text-muted">orders</p>
              </div>
              <div>
                <p className="stat text-xl text-strong">
                  {formatPrice(revenueInWindow)}
                </p>
                <p className="text-[0.68rem] text-muted">paid revenue</p>
              </div>
              <div>
                <p className="stat text-xl text-strong">
                  {formatPrice(aovMinor)}
                </p>
                <p className="text-[0.68rem] text-muted">avg order value</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <InteractiveChart data={detail.daily} />
          </div>

          {ordersInWindow === 0 && (
            <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-xs/5 text-muted">
              No orders yet in this time window. This chart updates automatically as customers check out.
            </p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {[
              { label: "Today", value: String(s.ordersToday) },
              { label: "This week", value: String(s.ordersWeek) },
              { label: "Visitors", value: String(s.sessionsWeek) },
            ].map((item) => (
              <div key={item.label} className="bg-surface-raised px-4 py-3">
                <p className="stat text-lg text-strong">{item.value}</p>
                <p className="text-xs text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ---- the shelf ---- */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-strong">The shelf</h2>
              <p className="mt-1 text-xs text-muted">
                {s.variantCount} sizes across {s.productCount} products
              </p>
            </div>
            {detail.tracked > 0 && (
              <div className="shrink-0 text-right">
                <p className="stat text-2xl text-strong">
                  {formatPrice(detail.stockValueMinor)}
                </p>
                <p className="text-xs text-muted">retail value</p>
              </div>
            )}
          </div>

          {/*
            Tracking off is a real state, not an empty one, and it needs saying
            out loud. A shelf card showing GH₵0.00 and an empty bar looks like a
            broken query; it actually means the imported catalogue arrived with
            an in-stock flag and no quantities, and nobody has counted the shelf
            yet. Inventing numbers for a real business would have been worse.
          */}
          {detail.tracked === 0 ? (
            <div className="mt-5 rounded-xl border border-line bg-surface-sunken p-4">
              <p className="text-sm font-semibold text-strong">
                Stock tracking is off
              </p>
              <p className="mt-1.5 text-xs/5 text-muted">
                All {s.variantCount} sizes are set to always available, because
                the imported catalogue came with an in-stock flag and no counts.
                Nothing will ever show as low or sold out until real quantities
                are entered.
              </p>
              <Link
                href="/admin/stock"
                className="mt-3 inline-block text-sm font-semibold text-accent-quiet underline-offset-4 hover:underline"
              >
                Switch it on and count the shelf &rarr;
              </Link>
            </div>
          ) : (
            <div className="mt-5">
              <HealthBar
                healthy={detail.healthy}
                low={s.lowStock}
                out={s.outOfStock}
              />
            </div>
          )}

          {detail.tracked > 0 && detail.lowStock.length > 0 ? (
            <>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Needs restocking
              </h3>
              <ul className="mt-3 divide-y divide-line">
                {detail.lowStock.map((item) => (
                  <li
                    key={item.variantId}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-strong">
                      {item.name}
                      {item.sizeLabel && (
                        <span className="text-muted"> · {item.sizeLabel}</span>
                      )}
                    </span>
                    <Pill tone={item.stockQty <= 0 ? "bad" : "warn"}>
                      {item.stockQty <= 0 ? "Out" : `${item.stockQty} left`}
                    </Pill>
                  </li>
                ))}
              </ul>
              <Link
                href="/admin/stock"
                className="mt-4 inline-block text-sm font-semibold text-accent-quiet underline-offset-4 hover:underline"
              >
                Adjust stock &rarr;
              </Link>
            </>
          ) : detail.tracked > 0 ? (
            <p className="mt-6 rounded-xl bg-surface-sunken px-4 py-3 text-xs/5 text-muted">
              Nothing is running low. Products appear here once they drop to
              their restock threshold.
            </p>
          ) : null}
        </Card>
      </div>

      {/* ---- what sells, what we stock, where orders are ---- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold text-strong">Best sellers</h2>
          <p className="mt-1 text-xs text-muted">
            By units, last 14 days
          </p>
          <RankedBars
            rows={detail.topProducts.map((product) => ({
              label: product.name,
              value: product.units,
              sub: formatPrice(product.revenueMinor),
            }))}
            emptyLabel="Nothing sold yet. This ranks products by units once orders start arriving, which is the question the order totals cannot answer."
          />
        </Card>

        <Card>
          <h2 className="font-semibold text-strong">The range</h2>
          <p className="mt-1 text-xs text-muted">Products per category</p>
          <RankedBars
            rows={detail.byCategory.map((category) => ({
              label: category.name,
              value: category.products,
            }))}
            emptyLabel="No categories yet."
          />
        </Card>

        <Card>
          <h2 className="font-semibold text-strong">Order pipeline</h2>
          <p className="mt-1 text-xs text-muted">
            Where orders are sitting right now
          </p>
          <Pipeline
            stages={PIPELINE_STAGES.map((stage) => ({
              label: stage.label,
              count:
                detail.pipeline.find((row) => row.status === stage.status)
                  ?.count ?? 0,
              tone: stage.tone,
            }))}
          />
        </Card>
      </div>

      {/* ---- setup and activity ---- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {remaining.length > 0 && (
          <Card>
            <h2 className="font-semibold text-strong">Before the shop opens</h2>
            <p className="mt-1 text-xs text-muted">
              {setup.length - remaining.length} of {setup.length} done. Steps
              disappear as you finish them.
            </p>
            <ol className="mt-5 space-y-4">
              {remaining.map((step) => (
                <li key={step.label} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-line"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-strong">
                      {step.href ? (
                        <Link
                          href={step.href}
                          className="underline-offset-4 hover:text-accent-quiet hover:underline"
                        >
                          {step.label}
                        </Link>
                      ) : (
                        step.label
                      )}
                    </p>
                    <p className="mt-0.5 text-xs/5 text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold text-strong">Recent changes</h2>
          <p className="mt-1 text-xs text-muted">
            Every edit is recorded against whoever made it.
          </p>

          {detail.activity.length > 0 ? (
            <ul className="mt-5 divide-y divide-line">
              {detail.activity.map((entry, index) => (
                <li key={index} className="flex items-baseline gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm text-strong">
                    {entry.action.replace(/\./g, " ")}
                    <span className="text-muted"> · {entry.entity}</span>
                    {entry.actorEmail && (
                      <span className="block text-xs text-muted">
                        {entry.actorEmail}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-xl bg-surface-sunken px-4 py-3 text-xs/5 text-muted">
              Nothing has been changed yet. Price edits, stock adjustments and
              order status changes all appear here, so a wrong figure can always
              be traced back to whoever set it.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
