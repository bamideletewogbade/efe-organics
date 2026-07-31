import Link from "next/link";

import { getDashboardSummary } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Overview.
 *
 * Answers the four questions a shop owner opens the admin to ask: is anything
 * waiting on me, am I about to run out of something, did we sell anything, and
 * is anyone visiting. Everything else is a click away.
 *
 * Tiles that need action are visually louder than tiles that are just numbers —
 * an "8 orders waiting" that looks the same as "41 products" buries the one
 * thing that actually needs doing this morning.
 */
export default async function AdminOverview() {
  const s = await getDashboardSummary();

  const actions = [
    {
      label: "Orders waiting",
      value: s.pendingOrders,
      href: "/admin/orders",
      urgent: s.pendingOrders > 0,
      hint: "Confirm delivery and payment",
    },
    {
      label: "Out of stock",
      value: s.outOfStock,
      href: "/admin/stock",
      urgent: s.outOfStock > 0,
      hint: "Not buyable right now",
    },
    {
      label: "Low stock",
      value: s.lowStock,
      href: "/admin/stock",
      urgent: s.lowStock > 0,
      hint: "Running down — restock soon",
    },
  ];

  const stats = [
    { label: "Orders today", value: String(s.ordersToday) },
    { label: "Orders this week", value: String(s.ordersWeek) },
    { label: "Paid this week", value: formatPrice(s.revenueWeekMinor) },
    { label: "Visitors this week", value: String(s.sessionsWeek) },
    { label: "Added to basket", value: String(s.addToCartWeek) },
    { label: "Products live", value: String(s.productCount) },
    { label: "Sellable sizes", value: String(s.variantCount) },
    { label: "Live promotions", value: String(s.activeDiscounts + s.activeBundles) },
  ];

  return (
    <div>
      <h1 className="text-2xl">Overview</h1>
      <p className="mt-2 text-sm text-muted">
        {s.configured
          ? "Everything that needs you, and how the shop is doing."
          : "Connect a database to see live numbers."}
      </p>

      {/* Needs action */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {actions.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${
              item.urgent
                ? "border-amber-500/40 bg-amber-500/[0.07]"
                : "border-line bg-surface-raised"
            }`}
          >
            <p className="text-sm text-muted">{item.label}</p>
            <p
              className={`stat mt-2 text-3xl ${
                item.urgent ? "text-amber-600 dark:text-amber-400" : "text-strong"
              }`}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted">{item.hint}</p>
          </Link>
        ))}
      </div>

      {/* Numbers */}
      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-raised p-5">
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="stat mt-1.5 text-xl text-strong">{stat.value}</p>
          </div>
        ))}
      </div>

      {!s.configured && (
        <div className="mt-8 rounded-2xl border border-line bg-surface-sunken p-6">
          <h2 className="text-base font-semibold text-strong">
            Getting the backend live
          </h2>
          <ol className="mt-3 space-y-2 text-sm/6 text-muted">
            <li>
              1. Create a Postgres database (Neon has a free tier) and put the
              connection string in <code>.env.local</code> as{" "}
              <code>DATABASE_URL</code>.
            </li>
            <li>
              2. <code>npm run db:migrate</code> — creates the 14 tables.
            </li>
            <li>
              3. <code>npm run db:seed</code> — loads the 42 imported SKUs as 28
              products.
            </li>
            <li>
              4. Set <code>ADMIN_PASSWORD</code> before deploying, or the admin
              locks itself shut.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
