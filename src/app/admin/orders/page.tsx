import Link from "next/link";

import { Empty, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { getCustomerBrief, listAdminOrders } from "@/db/queries/admin";
import { setOrderStatusAction } from "@/app/admin/actions";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

/**
 * Status tone.
 *
 * These were raw Tailwind reds, ambers and blues, which is why the admin looked
 * like several apps: those palettes have no relationship to the brand or to the
 * status tokens the rest of the back office uses. Mapped onto the semantic
 * tones instead, so "needs you" looks the same everywhere it appears.
 */
const STATUS_TONE: Record<
  string,
  "neutral" | "good" | "warn" | "bad" | "info"
> = {
  pending: "warn",
  confirmed: "info",
  paid: "good",
  packed: "good",
  shipped: "good",
  delivered: "good",
  cancelled: "neutral",
  refunded: "neutral",
};

/** The order of the real workflow, so the dropdown reads like the job. */
const NEXT_STATUS = [
  "pending",
  "confirmed",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  const [orders, brief] = await Promise.all([
    listAdminOrders({ customerId: customer }),
    customer ? getCustomerBrief(customer) : Promise.resolve(null),
  ]);

  const pending = orders.filter((order) => order.status === "pending").length;

  return (
    <div>
      <PageHeader
        title={brief ? `Orders from ${brief.name ?? brief.email}` : "Orders"}
        description="Newest first. Confirm the delivery charge with the customer before marking anything paid."
        meta={
          orders.length > 0
            ? `${orders.length} ${orders.length === 1 ? "order" : "orders"}`
            : undefined
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {pending > 0 && <Pill tone="warn">{pending} waiting</Pill>}
            {customer && (
              <Link
                href="/admin/orders"
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-accent/50"
              >
                Show all orders
              </Link>
            )}
          </div>
        }
      />

      {orders.length === 0 ? (
        <Empty
          title={customer ? "No orders from this customer" : "No orders yet"}
          body={
            customer
              ? "Their record exists but nothing has been ordered under it."
              : "Orders appear here the moment someone checks out."
          }
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <caption className="sr-only">Recent orders</caption>
            <thead>
              <tr className="border-b border-line bg-surface-sunken text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-strong">
                  Reference
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-strong">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-strong">
                  Items
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-strong">
                  Total
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-strong">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-strong">
                  Move to
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-line last:border-b-0 hover:bg-surface-sunken/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="ref text-strong underline-offset-4 hover:text-accent-quiet hover:underline"
                    >
                      {order.reference}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">
                      {new Date(order.placedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-strong">
                      {order.customerName ?? "No name given"}
                    </span>
                    {order.town && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {order.town}
                      </span>
                    )}
                  </td>
                  <td className="stat px-4 py-3 text-muted">
                    {order.itemCount}
                  </td>
                  <td className="stat px-4 py-3 text-right text-strong">
                    {formatPrice(order.totalMinor)}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_TONE[order.status] ?? "neutral"}>
                      {order.status}
                    </Pill>
                    {order.paymentStatus !== "paid" && (
                      <span className="mt-1 block text-[0.65rem] text-muted">
                        {order.paymentStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ActionForm
                      action={setOrderStatusAction}
                      className="flex gap-1.5"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <select
                        name="status"
                        defaultValue={order.status}
                        className="rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
                      >
                        {NEXT_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="small">Save</SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
