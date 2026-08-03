"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { duration, easeSoft } from "@/components/motion/tokens";

/**
 * Add-to-basket control for the product page.
 *
 * Quantity stepper plus the button, because on a product page someone buying
 * three bars should not have to press "add" three times, whereas on a grid card
 * a single tap is right, which is why the card uses its own minimal version.
 *
 * The button confirms in place: it swaps to "Added" for ~1.6s rather than firing
 * a toast. The drawer opening is already the real feedback; a toast on top of a
 * drawer is two notifications for one action.
 */
export function AddToCart({
  slug,
  disabled = false,
}: {
  slug: string;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const reduce = useReducedMotion();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    add(slug, qty);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex items-center rounded-full border border-line">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1 || disabled}
          aria-label="Decrease quantity"
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted transition-colors hover:text-strong disabled:opacity-40"
        >
          <Glyph d="M5 10h10" />
        </button>
        <span
          aria-live="polite"
          aria-label={`Quantity: ${qty}`}
          className="stat w-10 text-center text-base text-strong"
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(99, q + 1))}
          disabled={disabled}
          aria-label="Increase quantity"
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted transition-colors hover:text-strong disabled:opacity-40"
        >
          <Glyph d="M10 5v10M5 10h10" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="relative flex-1 overflow-hidden rounded-full bg-forest px-8 py-3.5 font-semibold text-paper transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <motion.span
          key={justAdded ? "added" : "idle"}
          initial={reduce ? false : { y: justAdded ? 14 : 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: duration.base, ease: easeSoft }}
          className="flex items-center justify-center gap-2"
        >
          {justAdded ? (
            <>
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 8.5 3.2 3.2L13 5" />
              </svg>
              Added
            </>
          ) : disabled ? (
            "Out of stock"
          ) : (
            "Add to basket"
          )}
        </motion.span>
      </button>
    </div>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d={d} />
    </svg>
  );
}
