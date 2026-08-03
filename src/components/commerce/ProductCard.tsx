"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { duration, easeSoft } from "@/components/motion/tokens";
import type { ProductGroup } from "@/lib/catalog";
import { sizeLabel } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/money";

/**
 * One shelf entry. A size family renders as a single card led by its cheapest
 * variant, so the grid shows 28 decisions rather than 41 near-duplicates.
 *
 * Micro-interactions, all pulling in one direction, "this is a physical object
 * you could pick up":
 *   · the card lifts and its shadow warms to leaf green;
 *   · the photograph cross-fades to a second angle (drawn from anywhere in the
 *     size family, since cheap variants often only got one shot);
 *   · size pills slide up from the lower edge;
 *   · a leaf hairline sweeps under the product name;
 *   · "Add to basket" rises into the footer, replacing the price row's
 *     right-hand side rather than pushing layout around.
 *
 * Everything is transform/opacity and every hover state is mirrored on
 * `:focus-within`, so keyboard users get the same affordances.
 */
export function ProductCard({
  group,
  index = 0,
}: {
  group: ProductGroup;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const { lead, variants } = group;

  const saving = discountPercent(lead.priceMinor, lead.compareAtMinor);
  const sizes = variants.map(sizeLabel).filter(Boolean) as string[];

  const [primary, ...leadRest] = lead.images;
  const secondary =
    leadRest[0] ??
    variants.find((v) => v !== lead && v.images[0] && v.images[0] !== primary)
      ?.images[0];

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: duration.slow,
        ease: easeSoft,
        delay: Math.min(index, 5) * 0.07,
      }}
      className="group relative h-full"
    >
      <Link
        href={`/shop/${lead.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:border-saffron/40 group-hover:shadow-[0_22px_48px_-26px_rgb(217_143_20_/_0.55)] group-focus-within:-translate-y-1.5 group-focus-within:border-saffron/40"
      >
        <div className="relative aspect-square overflow-hidden bg-surface-sunken">
          {primary ? (
            <>
              <Image
                src={primary}
                alt={group.name}
                fill
                sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                className={`object-contain p-4 transition-all duration-500 ease-out ${
                  secondary
                    ? "group-hover:opacity-0 group-focus-within:opacity-0"
                    : "group-hover:scale-105 group-focus-within:scale-105"
                }`}
              />
              {secondary && (
                <Image
                  src={secondary}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                  className="object-contain p-4 opacity-0 transition-all duration-500 ease-out group-hover:scale-[1.04] group-hover:opacity-100 group-focus-within:opacity-100"
                />
              )}
            </>
          ) : (
            <div
              aria-hidden
              className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-5xl text-muted/25"
            >
              efe
            </div>
          )}

          {saving !== null && (
            <span className="eyebrow absolute left-3 top-3 rounded-full bg-saffron-light px-2.5 py-1 text-[0.55rem] text-forest-deep shadow-sm">
              Save {saving}%
            </span>
          )}

          {/* Size pills slide up on hover, they are secondary to the image. */}
          {sizes.length > 1 && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-3 flex-wrap gap-1.5 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {sizes.map((size) => (
                <span
                  key={size}
                  className="rounded-full bg-forest-deep/85 px-2.5 py-1 text-[0.65rem] text-paper backdrop-blur-sm"
                >
                  {size}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="text-[0.95rem]/6 font-semibold text-strong">
            {group.name}
            <span className="mt-1 block h-px w-full origin-left scale-x-0 bg-saffron-light transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-within:scale-x-100" />
          </h3>

          {lead.blurb && (
            <p className="line-clamp-2 text-[0.82rem]/6 text-muted">
              {lead.blurb}
            </p>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <p className="flex items-baseline gap-1.5">
              {variants.length > 1 && (
                <span className="text-[0.65rem] uppercase tracking-wider text-muted">
                  from
                </span>
              )}
              <span className="stat text-lg text-strong">
                {formatPrice(lead.priceMinor)}
              </span>
              {lead.compareAtMinor && (
                <span className="text-xs text-muted/70 line-through">
                  {formatPrice(lead.compareAtMinor)}
                </span>
              )}
            </p>

            <span
              aria-hidden
              className="flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-forest text-paper opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h12l-1 10H5L4 6Z" />
                <path d="M7.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
