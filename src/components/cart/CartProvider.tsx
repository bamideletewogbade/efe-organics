"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  applyChange,
  countItems,
  readStoredCart,
  writeStoredCart,
  CART_STORAGE_KEY,
  type CartLine,
} from "@/lib/cart";
import type { Product } from "@/lib/catalog";
import { track } from "@/lib/analytics";

/**
 * Cart state.
 *
 * The store is `localStorage`, read through `useSyncExternalStore` rather than
 * mirrored into component state. That is not a style preference: reading storage
 * in an effect and calling `setState` causes a cascading render on every mount,
 * and it means the cart briefly disagrees with itself between the two.
 * `useSyncExternalStore` is the API built for exactly this — an external,
 * mutable source that React needs to stay consistent with.
 *
 * The snapshot must be referentially stable between changes or React re-renders
 * forever, so `snapshot` is a single frozen object replaced only on mutation.
 *
 * `getServerSnapshot` returns a shared empty state: the server cannot know the
 * basket, and returning a fresh `[]` each call would break hydration.
 *
 * The catalogue arrives ONCE from `layout.tsx` as a slug→product map, so lines
 * resolve to names, prices and images with no fetch and no loading state. 42
 * SKUs is a few KB; this would be hydrated from an API at thousands.
 *
 * Prices ALWAYS come from that map, never from the stored line — see lib/cart.ts.
 */

type Snapshot = { lines: CartLine[]; loaded: boolean };

const EMPTY: Snapshot = Object.freeze({
  lines: Object.freeze([]) as unknown as CartLine[],
  loaded: false,
});

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);

  // First subscriber pulls the persisted basket in.
  if (!snapshot.loaded) {
    snapshot = { lines: readStoredCart(), loaded: true };
    emit();
  }

  // Two tabs share one basket; keep them honest.
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      snapshot = { lines: readStoredCart(), loaded: true };
      emit();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

function mutate(change: Parameters<typeof applyChange>[1]) {
  const lines = applyChange(snapshot.lines, change);
  snapshot = { lines, loaded: true };
  writeStoredCart(lines);
  emit();
}

/* -------------------------------------------------------------------------- */

export type ResolvedLine = {
  product: Product;
  qty: number;
  lineTotalMinor: number;
};

type CartContextValue = {
  lines: ResolvedLine[];
  count: number;
  subtotalMinor: number;
  hydrated: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  catalogue,
  children,
}: {
  catalogue: Record<string, Product>;
  children: ReactNode;
}) {
  const { lines: raw, loaded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    // A slug no longer in the catalogue is dropped rather than rendered as a
    // blank row — otherwise the basket holds a ghost line nobody can remove.
    const lines: ResolvedLine[] = raw
      .map((line) => {
        const product = catalogue[line.slug];
        if (!product) return null;
        return {
          product,
          qty: line.qty,
          lineTotalMinor: product.priceMinor * line.qty,
        };
      })
      .filter((line): line is ResolvedLine => line !== null);

    return {
      lines,
      /**
       * Counted from RESOLVED lines, not the raw stored ones.
       *
       * Counting `raw` made the badge include slugs that are no longer in the
       * catalogue — a basket holding a discontinued product reported "8 items"
       * while the drawer showed 3, because the phantom line was counted but
       * never rendered. The badge must agree with what is on screen.
       */
      count: countItems(
        lines.map(({ product, qty }) => ({ slug: product.slug, qty })),
      ),
      subtotalMinor: lines.reduce((sum, line) => sum + line.lineTotalMinor, 0),
      hydrated: loaded,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (slug, qty = 1) => {
        mutate({ type: "add", slug, qty });
        setIsOpen(true);
        // Tracked here rather than in each button, so every route into the
        // basket is counted — product page, grid card, and anything added later.
        const product = catalogue[slug];
        track("add_to_cart", {
          slug,
          name: product?.name,
          qty,
          valueMinor: (product?.priceMinor ?? 0) * qty,
        });
      },
      setQty: (slug, qty) => mutate({ type: "set", slug, qty }),
      remove: (slug) => {
        mutate({ type: "remove", slug });
        track("remove_from_cart", { slug });
      },
      clear: () => mutate({ type: "clear" }),
    };
  }, [raw, loaded, catalogue, isOpen]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return context;
}
