"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import type { CategorySlug } from "@/lib/catalog.types";
import type { SortKey } from "@/lib/shop";
import { SORTS } from "@/lib/shop";

/**
 * Category and sort controls for the shop.
 *
 * Both are plain links that change the URL, not client state. That is a
 * deliberate choice for a catalogue: every filtered view gets a real, shareable,
 * crawlable URL, the back button behaves, and the page still works before
 * hydration. The only reason this is a client component at all is the shared
 * `layoutId` pill that slides between category chips.
 */
export function ShopToolbar({
  categories,
  activeCategory,
  activeSort,
  total,
}: {
  categories: Array<{ slug: CategorySlug; name: string; count: number }>;
  activeCategory: CategorySlug | null;
  activeSort: SortKey;
  total: number;
}) {
  const reduce = useReducedMotion();

  const href = (category: CategorySlug | null, sort: SortKey) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (sort !== "featured") params.set("sort", sort);
    const query = params.toString();
    return query ? `/shop?${query}` : "/shop";
  };

  const chips: Array<{ slug: CategorySlug | null; name: string; count: number }> =
    [{ slug: null, name: "Everything", count: total }, ...categories];

  return (
    <div className="flex flex-col gap-5 border-b border-line pb-6">
      {/* Categories. Horizontally scrollable on a phone rather than wrapping
          into four ragged rows and pushing the grid off the screen. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
          {chips.map((chip) => {
            const active = chip.slug === activeCategory;
            return (
              <li key={chip.slug ?? "all"} className="relative">
                <Link
                  href={href(chip.slug, activeSort)}
                  aria-current={active ? "true" : undefined}
                  className={`relative block whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
                    active
                      ? "text-forest-deep"
                      : "text-muted hover:text-strong"
                  }`}
                >
                  <span className="relative z-10">
                    {chip.name}
                    <span className="ml-1.5 text-[0.7rem] opacity-60">
                      {chip.count}
                    </span>
                  </span>
                </Link>

                {active && (
                  <motion.span
                    layoutId="shop-chip"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-saffron-light"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Count + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="stat text-strong">{total}</span>{" "}
          {total === 1 ? "product" : "products"}
        </p>

        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted">Sort</span>
          <ul className="flex items-center gap-1">
            {SORTS.map((sort) => (
              <li key={sort.key}>
                <Link
                  href={href(activeCategory, sort.key)}
                  aria-current={sort.key === activeSort ? "true" : undefined}
                  className={`block rounded-full px-3 py-1.5 transition-colors duration-200 ${
                    sort.key === activeSort
                      ? "bg-surface-sunken font-semibold text-strong"
                      : "text-muted hover:text-strong"
                  }`}
                >
                  {sort.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
