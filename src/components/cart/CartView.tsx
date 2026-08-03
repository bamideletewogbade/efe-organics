"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { duration, easeSoft } from "@/components/motion/tokens";
import { MAX_QTY_PER_LINE } from "@/lib/cart";
import { sizeLabel } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/money";

/**
 * Full basket.
 *
 * Shows total savings against the compare-at prices, because a basket of Efe
 * products usually carries a real discount and that is worth stating at the
 * moment someone is deciding whether to go through with it.
 *
 * The summary is sticky on desktop so the total stays visible down a long list,
 * on mobile it sits after the items, where a sticky bar would eat the viewport.
 *
 * Checkout is not wired yet (Paystack, Phase 2). The button says so plainly
 * rather than looking live and doing nothing.
 */
export function CartView() {
  const { lines, subtotalMinor, count, hydrated, setQty, remove, clear } =
    useCart();
  const reduce = useReducedMotion();

  if (!hydrated) {
    return (
      <div className="mt-10 h-40 animate-pulse rounded-2xl bg-surface-sunken" />
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-line bg-surface-sunken px-8 py-20 text-center">
        <span
          aria-hidden
          className="font-[family-name:var(--font-display)] text-7xl text-muted/20"
        >
          efe
        </span>
        <p className="mt-6 text-lg font-semibold text-strong">
          Your basket is empty
        </p>
        <p className="measure mx-auto mt-2 text-sm/6 text-muted">
          Start with the African Black Soap bath bar, it is where most people
          begin, and it is GH₵15.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-block rounded-full bg-forest px-7 py-3.5 font-semibold text-paper"
        >
          Browse the range
        </Link>
      </div>
    );
  }

  const savingsMinor = lines.reduce((sum, line) => {
    const compare = line.product.compareAtMinor;
    if (!compare) return sum;
    return sum + (compare - line.product.priceMinor) * line.qty;
  }, 0);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
      {/* ---- lines ---- */}
      <div>
        <ul className="divide-y divide-line border-y border-line">
          {lines.map(({ product, qty, lineTotalMinor }, index) => {
            const size = sizeLabel(product);
            const saving = discountPercent(
              product.priceMinor,
              product.compareAtMinor,
            );

            return (
              <motion.li
                key={product.slug}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: duration.base,
                  ease: easeSoft,
                  delay: Math.min(index, 6) * 0.04,
                }}
                className="flex gap-4 py-5 sm:gap-6"
              >
                <Link
                  href={`/shop/${product.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-sunken sm:h-32 sm:w-32"
                >
                  {product.images[0] && (
                    <Image
                      src={product.images[0]}
                      alt=""
                      aria-hidden
                      fill
                      sizes="128px"
                      className="object-contain p-2"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/shop/${product.slug}`}
                        className="font-semibold text-strong hover:text-accent"
                      >
                        {product.name}
                      </Link>
                      {size && (
                        <p className="mt-1 text-sm text-muted">{size}</p>
                      )}
                      <p className="mt-1 flex items-baseline gap-2 text-sm">
                        <span className="text-muted">
                          {formatPrice(product.priceMinor)} each
                        </span>
                        {saving !== null && (
                          <span className="eyebrow rounded-full bg-saffron/12 px-2 py-0.5 text-[0.55rem] text-accent">
                            −{saving}%
                          </span>
                        )}
                      </p>
                    </div>

                    <span className="stat shrink-0 text-lg text-strong">
                      {formatPrice(lineTotalMinor)}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-4 pt-4">
                    <div className="flex items-center rounded-full border border-line">
                      <Step
                        label={`Decrease quantity of ${product.name}`}
                        onClick={() => setQty(product.slug, qty - 1)}
                        d="M5 10h10"
                      />
                      <span
                        aria-live="polite"
                        className="stat w-9 text-center text-sm text-strong"
                      >
                        {qty}
                      </span>
                      <Step
                        label={`Increase quantity of ${product.name}`}
                        disabled={qty >= MAX_QTY_PER_LINE}
                        onClick={() => setQty(product.slug, qty + 1)}
                        d="M10 5v10M5 10h10"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(product.slug)}
                      className="text-sm text-muted underline underline-offset-4 hover:text-strong"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-accent"
          >
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 group-hover:-translate-x-1"
            >
              &larr;
            </span>
            Keep shopping
          </Link>
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted underline underline-offset-4 hover:text-strong"
          >
            Empty basket
          </button>
        </div>
      </div>

      {/* ---- summary ---- */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-3xl border border-line bg-surface-sunken p-6 sm:p-8">
          <h2 className="text-xl">Summary</h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">
                Items ({count})
              </dt>
              <dd className="text-strong">{formatPrice(subtotalMinor)}</dd>
            </div>
            {savingsMinor > 0 && (
              <div className="flex justify-between">
                <dt className="text-accent">You save</dt>
                <dd className="text-accent">−{formatPrice(savingsMinor)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-muted">Calculated at checkout</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="font-semibold text-strong">Subtotal</span>
            <span className="stat text-2xl text-strong">
              {formatPrice(subtotalMinor)}
            </span>
          </div>

          <Link
            href="/checkout"
            aria-describedby="checkout-note"
            className="group mt-6 block rounded-full bg-forest px-6 py-3.5 text-center font-semibold text-paper transition-transform active:scale-[0.99]"
          >
            Checkout
            <span
              aria-hidden
              className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </Link>
          <p id="checkout-note" className="mt-3 text-xs/5 text-muted">
            Mobile money and card. We confirm your delivery charge before
            anything is paid.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Step({
  label,
  onClick,
  disabled,
  d,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  d: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-strong disabled:opacity-40"
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d={d} />
      </svg>
    </button>
  );
}
