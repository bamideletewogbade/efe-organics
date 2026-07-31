/**
 * Shop URL contract: which query parameters exist and how they are parsed.
 *
 * Kept out of the page component so the toolbar, the page and any future
 * sitemap generator all agree on the same vocabulary — and so an unknown or
 * hand-edited parameter degrades to the default rather than throwing.
 */

import { CATEGORIES, type CategorySlug, type ProductGroup } from "./catalog";

export const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "name", label: "A–Z" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

export function parseCategory(value: unknown): CategorySlug | null {
  return typeof value === "string" &&
    CATEGORIES.some((category) => category.slug === value)
    ? (value as CategorySlug)
    : null;
}

export function parseSort(value: unknown): SortKey {
  return typeof value === "string" && SORTS.some((sort) => sort.key === value)
    ? (value as SortKey)
    : "featured";
}

/**
 * `featured` is the order `listShelf()` already returns — flagship line first,
 * then cheapest first — so it is left untouched rather than re-sorted.
 */
export function sortShelf(
  groups: ProductGroup[],
  sort: SortKey,
): ProductGroup[] {
  const sorted = groups.slice();
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.lead.priceMinor - b.lead.priceMinor);
    case "price-desc":
      return sorted.sort((a, b) => b.lead.priceMinor - a.lead.priceMinor);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}
