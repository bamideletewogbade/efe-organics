import Link from "next/link";

import { ProductCard } from "@/components/commerce/ProductCard";
import { Container } from "@/components/layout/Container";
import type { ProductGroup } from "@/lib/catalog";

/**
 * A titled grid of shelf entries. Used for both "Best sellers" and the flagship
 * line so the two read as the same object at different settings, rather than
 * two bespoke sections that drift apart.
 *
 * `note` exists for honesty: the bestseller rail uses it to say the ranking is
 * derived rather than measured.
 */
export function ProductRail({
  eyebrow,
  title,
  intro,
  note,
  groups,
  href,
  hrefLabel,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  note?: string;
  groups: ProductGroup[];
  href?: string;
  hrefLabel?: string;
  tone?: "light" | "tint";
}) {
  return (
    <section className={tone === "tint" ? "bg-surface-sunken py-20" : "py-20"}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="eyebrow text-accent-quiet">{eyebrow}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">{title}</h2>
            {intro && <p className="mt-3 text-muted">{intro}</p>}
          </div>

          {href && (
            <Link
              href={href}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-accent"
            >
              {hrefLabel ?? "See all"}
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group, index) => (
            <ProductCard key={group.key} group={group} index={index} />
          ))}
        </div>

        {note && <p className="mt-6 text-xs text-muted/80">{note}</p>}
      </Container>
    </section>
  );
}
