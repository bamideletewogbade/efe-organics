import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";

/**
 * The masthead every page except the landing one uses.
 *
 * WHY THIS EXISTS
 *
 * Six pages had each built their own, and they had drifted: four different
 * padding pairs, a gold bloom on the left on one page and the right on another
 * and absent on four, an eyebrow on some and a breadcrumb on others with no
 * rule about which. Individually each looked fine. In sequence they read as
 * pages from adjacent projects, which is the specific way a site stops feeling
 * designed even though nothing is obviously wrong.
 *
 * One component, one set of decisions:
 *
 * - A hairline before the eyebrow, echoing the landing hero, so the whole site
 *   opens a section the same way.
 * - The bloom always sits top-right. Consistency is the entire point; a
 *   decorative gradient that moves between pages is just noise.
 * - Breadcrumb OR eyebrow, never both. Shop and collections sit inside a
 *   hierarchy and need the trail; About and Contact are top level and get the
 *   label.
 * - `meta` is for facts the page already knows, like a product count. It used
 *   to be an ad-hoc paragraph on three pages with three different treatments.
 *
 * The LANDING hero is deliberately not this. It is full height with video and
 * its own rules, because the front door should not look like an interior page.
 */

export type Crumb = { name: string; href: string };

export function PageHero({
  eyebrow,
  crumbs,
  title,
  intro,
  meta,
  action,
  children,
}: {
  /** Small label above the title. Top-level pages. */
  eyebrow?: string;
  /** Trail for pages inside a hierarchy. Replaces the eyebrow. */
  crumbs?: Crumb[];
  /** The current page's name, shown unlinked at the end of the trail. */
  title: ReactNode;
  intro?: ReactNode;
  /** One line of facts, e.g. "41 products across 6 ranges". */
  meta?: ReactNode;
  action?: ReactNode;
  /** Anything that belongs below the copy, such as a filter row. */
  children?: ReactNode;
}) {
  return (
    <section className="on-dark relative overflow-hidden bg-forest-deep under-header">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-24 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_65%)] opacity-[0.12] blur-3xl"
      />

      <Container className="relative py-14 lg:py-20">
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="text-xs text-paper/50">
            {crumbs.map((crumb) => (
              <span key={crumb.href}>
                <Link href={crumb.href} className="hover:text-accent-quiet">
                  {crumb.name}
                </Link>
                <span aria-hidden> / </span>
              </span>
            ))}
            <span className="text-paper/80">{title}</span>
          </nav>
        ) : eyebrow ? (
          <p className="flex items-center gap-3.5">
            <span aria-hidden className="h-px w-8 bg-gold/70" />
            <span className="eyebrow text-[0.62rem] tracking-[0.24em] text-accent-quiet">
              {eyebrow}
            </span>
          </p>
        ) : null}

        <h1 className="mt-4 max-w-3xl text-[clamp(2.1rem,4.6vw,3.4rem)]/[1.06]">
          {title}
        </h1>

        {intro && (
          <p className="measure mt-5 text-base/7 text-paper/72 sm:text-lg/8">
            {intro}
          </p>
        )}

        {meta && <p className="mt-4 text-sm text-paper/50">{meta}</p>}

        {action && <div className="mt-8">{action}</div>}

        {children}
      </Container>
    </section>
  );
}
