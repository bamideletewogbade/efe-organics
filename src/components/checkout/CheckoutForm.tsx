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
import { getDeliveryQuote } from "@/lib/delivery";
import { formatPrice } from "@/lib/money";

/**
 * Checkout.
 *
 * Single page, not a wizard. With one address and no account, a multi-step flow
 * is friction for its own sake. Every step is a place to drop out, and the
 * whole form fits on one screen at this scale.
 *
 * **Payment is not live.** No Paystack keys exist and the prices are still the
 * reseller's rather than confirmed RRP, so this places a *reservation*: the
 * order is assembled, given a reference, and handed over for confirmation. The
 * button says "Place order" and the copy is explicit that nothing is charged
 * yet. When Paystack is wired this component keeps its shape, `onSubmit` calls
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
  /** The order could not be recorded, so the email handoff is the only copy. */
  const [storeFailed, setStoreFailed] = useState(false);
  /**
   * What the server actually charged, as opposed to what the basket estimated.
   *
   * Discount, tax and the WhatsApp handoff are all decided server-side and only
   * become known in the response, so they are held separately from `placed`
   * rather than being recomputed here. The browser must never be the thing that
   * says what a discount was worth.
   */
  const [settled, setSettled] = useState<{
    discountMinor: number;
    discountLabel: string | null;
    taxMinor: number;
    totalMinor: number | null;
    whatsappUrl: string | null;
    emailed: boolean;
  } | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<Region>("Greater Accra");
  const [selectedTown, setSelectedTown] = useState("");

  const activeQuote = getDeliveryQuote(selectedRegion, selectedTown);

  const field =
    "w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-body transition-colors placeholder:text-muted/60 focus:border-accent focus:outline-none";

  /**
   * Sends slugs and quantities, and lets the server decide everything else.
   *
   * The reference, the totals and the delivery charge all come back from the
   * response rather than being computed here. A price calculated in the browser
   * is a suggestion; the number the customer is held to has to be the server's.
   *
   * If the request fails the order is NOT lost. The basket is left intact and
   * the same confirmation screen renders from local data with a warning, so the
   * customer still has a reference and the email handoff. Losing a filled-in
   * checkout because a database was asleep is the worst outcome available.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lines.length === 0 || submitting) return;
    setSubmitting(true);
    setStoreFailed(false);

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

    let reference = makeReference();
    let deliveryFeeMinor: number | null = null;
    let stored = false;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: lines.map(({ product, qty }) => ({
            slug: product.slug,
            qty,
          })),
          delivery,
        }),
      });
      const result = await response.json();
      if (response.ok && result?.ok) {
        reference = result.reference;
        deliveryFeeMinor = result.deliveryMinor ?? null;
        stored = true;
        setSettled({
          discountMinor: result.discountMinor ?? 0,
          discountLabel: result.discount
            ? `${result.discount.name} (${result.discount.label})`
            : null,
          taxMinor: result.taxMinor ?? 0,
          totalMinor: result.totalMinor ?? null,
          whatsappUrl: result.whatsappUrl ?? null,
          emailed: Boolean(result.confirmationEmailed),
        });

        if (paystackReady) {
          try {
            const payRes = await fetch("/api/paystack/initialize", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reference }),
            });
            const payData = await payRes.json();
            if (payData.ok && payData.authorizationUrl) {
              clear();
              window.location.href = payData.authorizationUrl;
              return;
            }
          } catch {
            // Fall through to confirmation summary if Paystack fails
          }
        }
      }
    } catch {
      // Network failure. Fall through to the local handoff below.
    }

    setStoreFailed(!stored);
    setPlaced({
      reference,
      placedAt: new Date().toISOString(),
      lines: orderLines,
      subtotalMinor: subtotalOf(orderLines),
      deliveryFeeMinor,
      delivery,
    });
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
          `${line.qty} × ${line.name}. ${formatPrice(line.lineTotalMinor)}`,
      ),
      "",
      `Subtotal: ${formatPrice(placed.subtotalMinor)}`,
      ...(settled && settled.discountMinor > 0
        ? [`Discount: -${formatPrice(settled.discountMinor)}`]
        : []),
      placed.deliveryFeeMinor === null
        ? "Delivery: to be confirmed"
        : `Delivery: ${formatPrice(placed.deliveryFeeMinor)}`,
      ...(settled && settled.taxMinor > 0
        ? [`Tax: ${formatPrice(settled.taxMinor)}`]
        : []),
      ...(settled?.totalMinor !== null && settled?.totalMinor !== undefined
        ? [`Total: ${formatPrice(settled.totalMinor)}`]
        : placed.deliveryFeeMinor === null
          ? []
          : [
              `Total: ${formatPrice(
                placed.subtotalMinor + placed.deliveryFeeMinor,
              )}`,
            ]),
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
          {placed.deliveryFeeMinor === null ? (
            <>
              to confirm the delivery charge to {placed.delivery.town} and take
              payment by mobile money or card.
            </>
          ) : (
            <>
              to take payment by mobile money or card. Delivery to{" "}
              {placed.delivery.town} is{" "}
              <span className="font-semibold text-strong">
                {formatPrice(placed.deliveryFeeMinor)}
              </span>
              , so your total is{" "}
              <span className="font-semibold text-strong">
                {formatPrice(placed.subtotalMinor + placed.deliveryFeeMinor)}
              </span>
              .
            </>
          )}
        </p>

        {/* Only shown when the order could not be recorded. The customer needs
            to know their reference is not enough on its own. */}
        {storeFailed && (
          <p className="measure mx-auto mt-4 rounded-2xl border border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_8%,transparent)] p-4 text-sm/6 text-strong">
            We could not save this order automatically. Please send it to us
            using the button below so nothing is missed.
          </p>
        )}

        {/* A discount only ever appears here, from the server's figure. */}
        {settled && settled.discountMinor > 0 && (
          <p className="measure mx-auto mt-4 rounded-2xl border border-[color-mix(in_oklab,var(--live)_35%,transparent)] bg-[color-mix(in_oklab,var(--live)_8%,transparent)] p-4 text-sm/6 text-strong">
            {settled.discountLabel} applied. You saved{" "}
            <span className="font-semibold">
              {formatPrice(settled.discountMinor)}
            </span>
            .
          </p>
        )}

        <p className="measure mx-auto mt-4 rounded-2xl bg-surface-raised p-4 text-sm/6 text-muted">
          <span className="font-semibold text-strong">
            Nothing has been charged.
          </span>{" "}
          Payment happens once we have confirmed your total including delivery.
          {settled?.emailed && " A copy is on its way to your inbox."}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {/*
            WhatsApp first, deliberately.

            This is how Ghanaian beauty purchases actually get confirmed, and
            unlike email it needs no verified sending domain to work. The link
            arrives pre-written with the whole order in it, so the customer taps
            once and Efe has the order in the app they already have open.

            It only renders when an owner number is configured, and the email
            handoff stays as the path that always exists.
          */}
          {settled?.whatsappUrl && (
            <a
              href={settled.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-saffron-light px-6 py-3 text-sm font-semibold text-forest-deep transition-transform active:scale-[0.98]"
            >
              Send this order on WhatsApp
            </a>
          )}
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
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as Region)}
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
              value={selectedTown}
              onChange={(e) => setSelectedTown(e.target.value)}
              placeholder="e.g. East Legon, Spintex, Kumasi"
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
              <dt className="text-muted">
                Delivery <span className="text-xs font-normal">({activeQuote.name})</span>
              </dt>
              <dd className="stat font-medium text-strong">
                {formatPrice(activeQuote.rateMinor)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 font-semibold text-strong">
              <dt>Estimated Total</dt>
              <dd className="stat text-base text-[var(--color-gold-deep)]">
                {formatPrice(subtotalMinor + activeQuote.rateMinor)}
              </dd>
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
