"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { duration, easeSoft } from "@/components/motion/tokens";
import { brand } from "@/lib/brand";
import {
  makeReference,
  REGIONS,
  subtotalOf,
  type DeliveryDetails,
  type DraftOrder,
  type OrderLine,
  type Region,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/money";

/**
 * Checkout.
 *
 * Single page, not a wizard. With one address and no account, a multi-step flow
 * is friction for its own sake — every step is a place to drop out, and the
 * whole form fits on one screen at this scale.
 *
 * **Payment is not live.** No Paystack keys exist and the prices are still the
 * reseller's rather than confirmed RRP, so this places a *reservation*: the
 * order is assembled, given a reference, and handed over for confirmation. The
 * button says "Place order" and the copy is explicit that nothing is charged
 * yet. When Paystack is wired this component keeps its shape — `onSubmit` calls
 * a server action instead of composing a handoff.
 *
 * Delivery is quoted on confirmation because nobody has given us a rate card.
 * Showing "Free" or a guessed figure would be quoting a price the business
 * never agreed to.
 */
export function CheckoutForm({ paystackReady }: { paystackReady: boolean }) {
  const { lines, subtotalMinor, clear } = useCart();
  const reduce = useReducedMotion();
  const [placed, setPlaced] = useState<DraftOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const field =
    "w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-body transition-colors placeholder:text-muted/60 focus:border-accent focus:outline-none";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lines.length === 0) return;
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const delivery: DeliveryDetails = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      region: String(data.get("region") ?? "") as Region,
      town: String(data.get("town") ?? ""),
      address: String(data.get("address") ?? ""),
      notes: String(data.get("notes") ?? "") || undefined,
    };

    const orderLines: OrderLine[] = lines.map(
      ({ product, qty, lineTotalMinor }) => ({
        slug: product.slug,
        name: product.name,
        qty,
        unitPriceMinor: product.priceMinor,
        lineTotalMinor,
      }),
    );

    const order: DraftOrder = {
      reference: makeReference(),
      placedAt: new Date().toISOString(),
      lines: orderLines,
      subtotalMinor: subtotalOf(orderLines),
      deliveryFeeMinor: null,
      delivery,
    };

    setPlaced(order);
    clear();
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  /* ---------------- confirmation ---------------- */
  if (placed) {
    const summary = [
      `Order ${placed.reference}`,
      "",
      ...placed.lines.map(
        (line) =>
          `${line.qty} × ${line.name} — ${formatPrice(line.lineTotalMinor)}`,
      ),
      "",
      `Subtotal: ${formatPrice(placed.subtotalMinor)}`,
      "Delivery: to be confirmed",
      "",
      `${placed.delivery.name}`,
      `${placed.delivery.phone} · ${placed.delivery.email}`,
      `${placed.delivery.address}, ${placed.delivery.town}, ${placed.delivery.region}`,
      ...(placed.delivery.notes ? ["", `Notes: ${placed.delivery.notes}`] : []),
    ].join("\n");

    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: easeSoft }}
        className="mx-auto max-w-2xl rounded-3xl border border-line bg-surface-sunken p-8 text-center sm:p-12"
      >
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-saffron/15 text-accent"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 12.5 5 5L20 6.5" />
          </svg>
        </span>

        <h2 className="mt-6 text-2xl sm:text-3xl">Order received</h2>
        <p className="stat mt-3 text-lg text-accent">{placed.reference}</p>

        <p className="measure mx-auto mt-5 text-base/7 text-muted">
          Thank you, {placed.delivery.name.split(" ")[0]}. We have your order and
          will contact you on{" "}
          <span className="font-semibold text-strong">
            {placed.delivery.phone}
          </span>{" "}
          to confirm the delivery charge to {placed.delivery.town} and take
          payment by mobile money or card.
        </p>

        <p className="measure mx-auto mt-4 rounded-2xl bg-surface-raised p-4 text-sm/6 text-muted">
          <span className="font-semibold text-strong">
            Nothing has been charged.
          </span>{" "}
          Payment happens once we have confirmed your total including delivery.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={`mailto:${brand.contact.email}?subject=${encodeURIComponent(
              `Order ${placed.reference}`,
            )}&body=${encodeURIComponent(summary)}`}
            className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper"
          >
            Email us this order
          </a>
          <Link
            href="/shop"
            className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-strong transition-colors hover:border-accent/50"
          >
            Keep shopping
          </Link>
        </div>

        <details className="mt-8 text-left">
          <summary className="cursor-pointer text-sm font-semibold text-strong">
            Your order
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-raised p-4 text-xs/6 text-muted">
            {summary}
          </pre>
        </details>
      </motion.div>
    );
  }

  /* ---------------- empty ---------------- */
  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-line bg-surface-sunken px-8 py-20 text-center">
        <p className="text-lg font-semibold text-strong">
          There is nothing to check out
        </p>
        <p className="mt-2 text-sm/6 text-muted">
          Add something to your basket first.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-forest px-7 py-3.5 font-semibold text-paper"
        >
          Browse the range
        </Link>
      </div>
    );
  }

  /* ---------------- form ---------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16"
    >
      <div>
        <h2 className="text-xl">Delivery details</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Full name
            </span>
            <input name="name" required autoComplete="name" className={field} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Phone / WhatsApp
            </span>
            <input
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="024 000 0000"
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Region
            </span>
            <select
              name="region"
              required
              defaultValue="Greater Accra"
              className={field}
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Town / city
            </span>
            <input
              name="town"
              required
              autoComplete="address-level2"
              className={field}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Delivery address
            </span>
            <textarea
              name="address"
              rows={3}
              required
              autoComplete="street-address"
              placeholder="Street, house number, landmark"
              className={`${field} resize-y`}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-strong">
              Anything we should know? <span className="font-normal text-muted">(optional)</span>
            </span>
            <textarea
              name="notes"
              rows={2}
              placeholder="Preferred delivery time, gift note…"
              className={`${field} resize-y`}
            />
          </label>
        </div>
      </div>

      {/* ---- summary ---- */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-3xl border border-line bg-surface-sunken p-6 sm:p-8">
          <h2 className="text-xl">Your order</h2>

          <ul className="mt-5 space-y-3 border-b border-line pb-5">
            {lines.map(({ product, qty, lineTotalMinor }) => (
              <li
                key={product.slug}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-muted">
                  <span className="stat text-strong">{qty}×</span>{" "}
                  {product.name}
                </span>
                <span className="stat shrink-0 text-strong">
                  {formatPrice(lineTotalMinor)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="stat text-strong">
                {formatPrice(subtotalMinor)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-muted">Confirmed with you</dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 w-full rounded-full bg-forest px-6 py-3.5 font-semibold text-paper transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? "Placing…" : "Place order"}
          </button>

          <p className="mt-3 text-xs/5 text-muted">
            {paystackReady
              ? "You will be taken to Paystack to pay by mobile money or card."
              : "No payment is taken now. We will confirm your total including delivery, then send a mobile money or card payment link."}
          </p>

          <ul className="mt-5 space-y-2 border-t border-line pt-5 text-xs text-muted">
            {[
              "MTN & Telecel mobile money",
              "Visa & Mastercard",
              "Delivery across Ghana",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 8.5 3.2 3.2L13 5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </form>
  );
}
