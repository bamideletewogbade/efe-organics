import Link from "next/link";
import { notFound } from "next/navigation";

import {
  setDeliveryFeeAction,
  setOrderStatusAction,
  setMoMoPaymentAction,
} from "@/app/admin/actions";
import { Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { analyzeOrderCustomerAction } from "@/app/admin/ai-actions";
import { OrderAiAnalyst } from "@/components/admin/OrderAiAnalyst";
import { WhatsAppDispatch } from "@/components/admin/WhatsAppDispatch";
import { getAdminOrder } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

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

const FLOW = [
  "pending",
  "confirmed",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

/**
 * One order. The screen the shop could not open without.
 *
 * The list could change a status but never showed WHAT was ordered or let anyone
 * set the delivery charge, which meant the daily job (confirm, quote delivery,
 * take payment) had no home. This is that home.
 *
 * Three columns of intent: what they bought, where it goes, what to do next.
 * Delivery sits at the top of the actions because it is the first thing that
 * happens after an order lands and the total is wrong until it is done.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAdminOrder(id);
  if (!result) notFound();

  const { order, items } = result;
  const quoted = order.deliveryMinor !== null;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/admin/orders" className="hover:text-accent-quiet">
          Orders
        </Link>
        <span aria-hidden> / </span>
        <span className="ref text-strong">{order.reference}</span>
      </nav>

      <PageHeader
        title={<span className="ref">{order.reference}</span>}
        description={`Placed ${new Date(order.placedAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone={STATUS_TONE[order.status] ?? "neutral"}>
              {order.status}
            </Pill>
            <Pill tone={order.paymentStatus === "paid" ? "good" : "warn"}>
              {order.paymentStatus}
            </Pill>
          </div>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* ---- what they bought ---- */}
        <div className="grid gap-5">
          <Card>
            <h2 className="font-semibold text-strong">Items</h2>
            <ul className="mt-4 divide-y divide-line">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    {/* The line snapshots its name, so this links out to the
                        live product rather than reading from it. Answers "is
                        the thing they ordered still in stock" in one click. */}
                    {item.slugSnapshot ? (
                      <Link
                        href={`/shop/${item.slugSnapshot}`}
                        target="_blank"
                        className="font-medium text-strong underline-offset-4 hover:text-accent-quiet hover:underline"
                      >
                        {item.nameSnapshot}
                      </Link>
                    ) : (
                      <p className="font-medium text-strong">
                        {item.nameSnapshot}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">
                      {item.sizeSnapshot ? `${item.sizeSnapshot} · ` : ""}
                      {formatPrice(item.unitPriceMinor)} each
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="stat text-strong">
                      {formatPrice(item.lineTotalMinor)}
                    </p>
                    <p className="stat mt-0.5 text-xs text-muted">
                      ×{item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="stat text-strong">
                  {formatPrice(order.subtotalMinor)}
                </dd>
              </div>
              {order.discountMinor > 0 && (
                <div className="flex justify-between">
                  <dt className="text-[var(--live)]">Discount</dt>
                  <dd className="stat text-[var(--live)]">
                    −{formatPrice(order.discountMinor)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className={quoted ? "stat text-strong" : "text-muted"}>
                  {quoted ? formatPrice(order.deliveryMinor!) : "Not quoted yet"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-semibold text-strong">Total</dt>
                <dd className="stat text-lg text-strong">
                  {formatPrice(order.totalMinor)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold text-strong">Deliver to</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Name", order.deliveryName],
                ["Phone", order.deliveryPhone],
                ["Email", order.deliveryEmail],
                ["Town", order.deliveryTown],
                ["Region", order.deliveryRegion],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 text-strong">
                    {value || <span className="text-muted">Not given</span>}
                  </dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Address</dt>
                <dd className="mt-0.5 whitespace-pre-line text-strong">
                  {order.deliveryAddress || (
                    <span className="text-muted">Not given</span>
                  )}
                </dd>
              </div>
              {order.customerNote && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Their note</dt>
                  <dd className="mt-0.5 text-strong">{order.customerNote}</dd>
                </div>
              )}
            </dl>

            <WhatsAppDispatch
              order={{
                reference: order.reference,
                customerName: order.deliveryName,
                deliveryPhone: order.deliveryPhone,
                deliveryTown: order.deliveryTown,
                totalMinor: order.totalMinor,
                status: order.status,
              }}
            />
          </Card>

          <OrderAiAnalyst orderId={order.id} action={analyzeOrderCustomerAction} />
        </div>

        {/* ---- what to do next ---- */}
        <div className="grid gap-5 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <h2 className="font-semibold text-strong">
              {quoted ? "Delivery charge" : "Quote delivery"}
            </h2>
            <p className="mt-1.5 text-xs/5 text-muted">
              {quoted
                ? "Change it and the total recalculates."
                : `Confirm what it costs to reach ${order.deliveryTown || "them"}. The total is incomplete until you do.`}
            </p>

            <ActionForm
              action={setDeliveryFeeAction}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Delivery (GH₵)
                </span>
                <input
                  name="deliveryFee"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={
                    order.deliveryMinor !== null
                      ? (order.deliveryMinor / 100).toFixed(2)
                      : ""
                  }
                  className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Internal note{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </span>
                <input
                  name="internalNote"
                  defaultValue={order.internalNote ?? ""}
                  placeholder="Courier, pickup point…"
                  className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"
                />
              </label>
              <SubmitButton pendingLabel="Updating">
                {quoted ? "Update total" : "Set delivery and confirm"}
              </SubmitButton>
            </ActionForm>
          </Card>

          <Card>
            <h2 className="font-semibold text-strong">Mobile Money (MoMo) Payment</h2>
            <p className="mt-1.5 text-xs/5 text-muted">
              Record customer's MoMo transfer transaction ID to mark as paid.
            </p>
            <ActionForm action={setMoMoPaymentAction} className="mt-4 grid gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  MoMo Transaction Ref / ID
                </span>
                <input
                  name="momoReference"
                  defaultValue={order.momoReference ?? ""}
                  placeholder="e.g. 29481039481"
                  required
                  className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"
                />
              </label>
              <SubmitButton pendingLabel="Saving MoMo Ref">
                Save & Mark Paid
              </SubmitButton>
            </ActionForm>
            {order.momoReference && (
              <p className="mt-2 text-xs font-medium text-[var(--live)]">
                Recorded MoMo Ref: {order.momoReference}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-strong">Move it along</h2>
            <ActionForm
              action={setOrderStatusAction}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"
              >
                {FLOW.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <SubmitButton variant="quiet">Save status</SubmitButton>
            </ActionForm>
            <p className="mt-3 text-xs/5 text-muted">
              Marking an order <strong>paid</strong> also settles its payment
              status, so revenue stays correct.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
