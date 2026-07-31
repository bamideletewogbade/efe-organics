/**
 * Cart types and storage.
 *
 * Deliberately framework-free so the shape can be reused by a server cart later
 * without rewriting the client.
 *
 * **A cart line stores the SKU slug and quantity — never the price.** Prices are
 * resolved from the catalogue at render time. Persisting a price would mean a
 * cart saved last week quotes last week's number, and at checkout the client
 * would be telling the server what to charge, which is the classic e-commerce
 * hole. The server re-prices from the catalogue when Paystack is wired.
 */

export type CartLine = {
  slug: string;
  qty: number;
};

export const CART_STORAGE_KEY = "efe-cart-v1";
export const MAX_QTY_PER_LINE = 99;

/** Reads and validates the stored cart. Never throws — a corrupt value is an empty cart. */
export function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).slug === "string" &&
          Number.isFinite((line as CartLine).qty),
      )
      .map((line) => ({
        slug: line.slug,
        qty: clampQty(line.qty),
      }))
      .filter((line) => line.qty > 0);
  } catch {
    return [];
  }
}

export function writeStoredCart(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private browsing / quota. The in-memory cart still works this session.
  }
}

export function clampQty(qty: number): number {
  return Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));
}

/** Pure reducer over cart lines — easy to test, and reused by the provider. */
export function applyChange(
  lines: CartLine[],
  change:
    | { type: "add"; slug: string; qty?: number }
    | { type: "set"; slug: string; qty: number }
    | { type: "remove"; slug: string }
    | { type: "clear" },
): CartLine[] {
  switch (change.type) {
    case "add": {
      const qty = clampQty(change.qty ?? 1);
      if (qty === 0) return lines;
      const existing = lines.find((line) => line.slug === change.slug);
      if (!existing) return [...lines, { slug: change.slug, qty }];
      return lines.map((line) =>
        line.slug === change.slug
          ? { ...line, qty: clampQty(line.qty + qty) }
          : line,
      );
    }
    case "set": {
      const qty = clampQty(change.qty);
      if (qty === 0) return lines.filter((line) => line.slug !== change.slug);
      return lines.map((line) =>
        line.slug === change.slug ? { ...line, qty } : line,
      );
    }
    case "remove":
      return lines.filter((line) => line.slug !== change.slug);
    case "clear":
      return [];
  }
}

export function countItems(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.qty, 0);
}
