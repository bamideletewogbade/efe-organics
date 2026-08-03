import Link from "next/link";

import {
  Empty,
  PageHeader,
  Pill,
  Stat,
  StatGrid,
} from "@/components/admin/AdminUI";
import { listAdminCustomers } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

/**
 * Customers.
 *
 * Built around one job: deciding who to call. So the table leads with spend and
 * order count, and every row carries a WhatsApp link, because that is how this
 * market actually talks to its customers. A screen that led with signup date
 * would be a mailing list, not a sales tool.
 *
 * There is no create button. A customer record is a by-product of an order, and
 * an admin that lets you type a customer in by hand quietly becomes a second,
 * worse CRM that disagrees with the orders table.
 */
export default async function AdminCustomersPage() {
  const rows = await listAdminCustomers();

  const repeat = rows.filter((row) => row.orderCount > 1).length;
  const paying = rows.filter((row) => row.spentMinor > 0);
  const totalSpend = paying.reduce((sum, row) => sum + row.spentMinor, 0);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone who has placed an order, sorted by what they have actually paid."
        meta={rows.length > 0 ? `${rows.length} in total` : undefined}
      />

      {rows.length === 0 ? (
        <Empty
          title="No customers yet"
          body="A customer record is created automatically the first time someone checks out. Nothing to add by hand."
        />
      ) : (
        <>
          <StatGrid>
            <Stat label="Customers" value={String(rows.length)} />
            <Stat
              label="Ordered more than once"
              value={String(repeat)}
              hint={
                rows.length > 0
                  ? `${Math.round((repeat / rows.length) * 100)}% of customers`
                  : undefined
              }
              tone={repeat > 0 ? "good" : "neutral"}
            />
            <Stat label="Total paid" value={formatPrice(totalSpend)} />
            <Stat
              label="Average paid"
              value={
                paying.length > 0
                  ? formatPrice(Math.round(totalSpend / paying.length))
                  : formatPrice(0)
              }
              hint="Across customers who have paid"
            />
          </StatGrid>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <caption className="sr-only">Customers by spend</caption>
              <thead>
                <tr className="border-b border-line bg-surface-sunken text-left">
                  {["Customer", "Contact", "Orders", "Paid", "Last order", ""].map(
                    (heading, index) => (
                      <th
                        key={heading || index}
                        scope="col"
                        className={`px-4 py-3 font-semibold text-strong ${
                          heading === "Orders" || heading === "Paid"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-line last:border-b-0 hover:bg-surface-sunken/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-strong">
                        {row.name ?? "No name given"}
                      </span>
                      {row.orderCount > 1 && (
                        <span className="ml-2 align-middle">
                          <Pill tone="good">Repeat</Pill>
                        </span>
                      )}
                      {row.notes && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {row.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-muted">{row.email}</span>
                      {row.phone && (
                        <span className="stat mt-0.5 block text-xs text-muted">
                          {row.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.orderCount > 0 ? (
                        <Link
                          href={`/admin/orders?customer=${row.id}`}
                          className="stat text-strong underline-offset-4 hover:text-accent-quiet hover:underline"
                        >
                          {row.orderCount}
                        </Link>
                      ) : (
                        <span className="stat text-muted">0</span>
                      )}
                    </td>
                    <td className="stat px-4 py-3 text-right text-strong">
                      {formatPrice(row.spentMinor)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.lastOrderAt
                        ? new Date(row.lastOrderAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.phone && (
                        <a
                          href={`https://wa.me/${row.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-accent/50"
                        >
                          WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
