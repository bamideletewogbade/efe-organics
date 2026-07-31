import { listAdminOrders } from "@/db/queries/admin";
import { setOrderStatusAction } from "@/app/admin/actions";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  confirmed: "bg-blue-500/12 text-blue-700 dark:text-blue-400",
  paid: "bg-saffron/15 text-accent",
  packed: "bg-saffron/15 text-accent",
  shipped: "bg-saffron/15 text-accent",
  delivered: "bg-saffron/20 text-accent",
  cancelled: "bg-surface-sunken text-muted",
  refunded: "bg-surface-sunken text-muted",
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

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <div>
      <h1 className="text-2xl">Orders</h1>
      <p className="mt-2 text-sm text-muted">
        Newest first. Confirm the delivery charge with the customer before
        marking anything paid.
      </p>

      {orders.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-line bg-surface-sunken p-8 text-center text-sm text-muted">
          No orders yet. They will appear here the moment someone checks out.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          <table className="w-full border-collapse text-sm">
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
                    <span className="stat text-strong">{order.reference}</span>
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
                      {order.customerName ?? "—"}
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
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_STYLE[order.status] ?? "bg-surface-sunken text-muted"
                      }`}
                    >
                      {order.status}
                    </span>
                    {order.paymentStatus !== "paid" && (
                      <span className="mt-1 block text-[0.65rem] text-muted">
                        {order.paymentStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form action={setOrderStatusAction} className="flex gap-1.5">
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
                      <button
                        type="submit"
                        className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-paper"
                      >
                        Save
                      </button>
                    </form>
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
