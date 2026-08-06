"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { duration, easeSoft } from "@/components/motion/tokens";
import { sizeLabel } from "@/lib/catalog.types";
import { formatPrice } from "@/lib/money";
import { MAX_QTY_PER_LINE } from "@/lib/cart";

/**
 * Slide-over basket.
 *
 * A drawer rather than a cart page: adding something should not cost you your
 * place in the grid. The page behind stays scrolled where it was, and closing
 * returns you to it.
 *
 * Accessibility is the part that usually gets skipped on these:
 *   · `role="dialog"` + `aria-modal` so assistive tech treats it as a layer;
 *   · Escape closes;
 *   · focus moves into the panel on open and back to the trigger on close;
 *   · body scroll is locked while open, so the page behind cannot scroll away.
 *
 * On mobile it is a bottom sheet, on desktop a right-hand panel, the same
 * component, because thumb reach and cursor reach want different edges.
 */
export function CartDrawer() {
  const { isOpen, close, lines, subtotalMinor, count, setQty, remove } =
    useCart();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    // Defer so the panel exists before we move focus into it.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 40);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      (restoreFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <motion.button
            type="button"
            aria-label="Close basket"
            onClick={close}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base }}
            className="absolute inset-0 h-full w-full cursor-default bg-forest-deep/60 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your basket"
            initial={reduce ? false : { y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: "100%", opacity: 0.6 }}
            transition={{ duration: duration.slow, ease: easeSoft }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-line bg-surface sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0"
          >
            {/* header */}
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold text-strong">
                Your basket
                {count > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted">
                    {count} {count === 1 ? "item" : "items"}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={close}
                data-autofocus
                aria-label="Close basket"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-sunken hover:text-strong"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            </div>

            {/* lines */}
            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
                <span
                  aria-hidden
                  className="font-[family-name:var(--font-display)] text-6xl text-muted/20"
                >
                  efe
                </span>
                <p className="mt-5 text-base font-semibold text-strong">
                  Nothing in here yet
                </p>
                <p className="mt-2 text-sm/6 text-muted">
                  Black soap, herbal shampoos, shea butters, have a look.
                </p>
                <Link
                  href="/shop"
                  onClick={close}
                  className="mt-6 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper"
                >
                  Browse the range
                </Link>
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                {lines.map(({ product, qty, lineTotalMinor }) => {
                  const size = sizeLabel(product);
                  return (
                    <li key={product.slug} className="flex gap-4 py-4">
                      <Link
                        href={`/shop/${product.slug}`}
                        onClick={close}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-sunken"
                      >
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt=""
                            aria-hidden
                            fill
                            sizes="80px"
                            className="object-contain p-1.5"
                          />
                        ) : null}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/shop/${product.slug}`}
                          onClick={close}
                          className="block text-sm font-semibold text-strong hover:text-accent"
                        >
                          {product.name}
                        </Link>
                        {size && (
                          <p className="mt-0.5 text-xs text-muted">{size}</p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center rounded-full border border-line">
                            <QtyButton
                              label={`Decrease quantity of ${product.name}`}
                              onClick={() => setQty(product.slug, qty - 1)}
                            >
                              <path d="M5 10h10" />
                            </QtyButton>
                            <span
                              aria-live="polite"
                              className="stat w-8 text-center text-sm text-strong"
                            >
                              {qty}
                            </span>
                            <QtyButton
                              label={`Increase quantity of ${product.name}`}
                              disabled={qty >= MAX_QTY_PER_LINE}
                              onClick={() => setQty(product.slug, qty + 1)}
                            >
                              <path d="M10 5v10M5 10h10" />
                            </QtyButton>
                          </div>

                          <span className="stat text-sm text-strong">
                            {formatPrice(lineTotalMinor)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(product.slug)}
                          className="mt-2 text-xs text-muted underline underline-offset-4 hover:text-strong"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* footer */}
            {lines.length > 0 && (
              <div className="border-t border-line px-5 py-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted">Subtotal</span>
                  <span className="stat text-xl text-strong">
                    {formatPrice(subtotalMinor)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Delivery calculated at checkout.
                </p>

                <Link
                  href="/cart"
                  onClick={close}
                  className="mt-4 block rounded-full bg-forest px-6 py-3.5 text-center font-semibold text-paper transition-transform active:scale-[0.99]"
                >
                  Review basket
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 w-full rounded-full px-6 py-2.5 text-sm text-muted transition-colors hover:text-strong"
                >
                  Keep shopping
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function QtyButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-strong disabled:opacity-40"
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
        {children}
      </svg>
    </button>
  );
}
