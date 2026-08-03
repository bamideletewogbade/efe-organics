import Link from "next/link";

import {
  ButtonLink,
  Card,
  PageHeader,
  Pill,
  Stat,
  StatGrid,
} from "@/components/admin/AdminUI";
import { getDashboardSummary } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Overview.
 *
 * Answers the four questions someone opens a back office to ask: is anything
 * waiting on me, am I about to run out, did we sell anything, is anyone
 * visiting. Everything else is a click away.
 *
 * NEEDS-ACTION IS LOUDER THAN NICE-TO-KNOW. Three tiles at the top change colour
 * only when they are non-zero; a shop with nothing waiting shows a calm screen,
 * and a shop with eight unconfirmed orders shows amber. A dashboard where "8
 * orders waiting" looks identical to "41 products" buries the one thing that
 * actually needs doing this morning.
 */
export default async function AdminOverview() {
  const s = await getDashboardSummary();

  const actions = [
    {
      label: "Orders waiting",
      value: s.pendingOrders,
      href: "/admin/orders",
      hint: "Confirm delivery and take payment",
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

  return (
    <div>
      <PageHeader
        title="Overview"
        description={
          s.configured
            ? "Everything that needs you, and how the shop is doing this week."
            : "Connect a database to see live numbers."
        }
        action={<ButtonLink href="/admin/orders">Go to orders</ButtonLink>}
      />

      {/* ---- needs action ---- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {actions.map((item) => {
          const urgent = item.value > 0;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-20px_rgb(20_67_44_/_0.5)] ${
                urgent
                  ? "border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_7%,transparent)]"
                  : "border-line bg-surface-raised"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted">{item.label}</p>
                {urgent && <Pill tone={item.tone}>Needs you</Pill>}
              </div>
              <p
                className={`stat mt-2 text-3xl ${
                  urgent ? "text-[var(--progress)]" : "text-strong"
                }`}
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            </Link>
          );
        })}
      </div>

      {/* ---- this week ---- */}
      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        This week
      </h2>
      <StatGrid>
        <Stat label="Orders today" value={String(s.ordersToday)} />
        <Stat label="Orders this week" value={String(s.ordersWeek)} />
        <Stat
          label="Paid this week"
          value={formatPrice(s.revenueWeekMinor)}
          tone={s.revenueWeekMinor > 0 ? "good" : "neutral"}
        />
        <Stat
          label="Visitors"
          value={String(s.sessionsWeek)}
          hint={`${s.addToCartWeek} added to basket`}
        />
      </StatGrid>

      {/* ---- the shop ---- */}
      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        The shop
      </h2>
      <StatGrid>
        <Stat label="Products live" value={String(s.productCount)} />
        <Stat label="Sellable sizes" value={String(s.variantCount)} />
        <Stat label="Discounts running" value={String(s.activeDiscounts)} />
        <Stat label="Bundles running" value={String(s.activeBundles)} />
      </StatGrid>

      {!s.configured && (
        <Card className="mt-10">
          <h2 className="font-semibold text-strong">Getting the shop live</h2>
          <ol className="measure mt-4 space-y-3 text-sm/6 text-muted">
            {[
              <>
                Create a Postgres database and put the connection string in{" "}
                <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-strong">
                  .env.local
                </code>{" "}
                as{" "}
                <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-strong">
                  DATABASE_URL
                </code>
                .
              </>,
              <>
                Run{" "}
                <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-strong">
                  npm run db:migrate
                </code>{" "}
                to create the tables.
              </>,
              <>
                Run{" "}
                <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-strong">
                  npm run db:seed
                </code>{" "}
                to load the 42 imported products.
              </>,
              <>
                Set{" "}
                <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-strong">
                  ADMIN_PASSWORD
                </code>{" "}
                before deploying, the admin locks itself shut without it.
              </>,
            ].map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="stat shrink-0 text-accent-quiet">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
