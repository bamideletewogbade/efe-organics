"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Container } from "@/components/layout/Container";
import { duration, easeSoft } from "@/components/motion/tokens";

/**
 * What is actually in the bottle.
 *
 * WHAT THIS REPLACED, AND WHY IT HAD TO GO
 *
 * The homepage carried a testimonials section headed "In their words", with
 * three quotes, star ratings, and a small label reading "sample content, real
 * reviews not yet collected". The quotes were written to design against. They
 * went live with the domain.
 *
 * Invented reviews attributed to customers of a real business are fabricated
 * social proof. They are unlawful under consumer protection rules in most
 * markets Efe would ever sell into, and the "sample content" label does not fix
 * that: a shopper reads the quote, not the caveat. Efe has no collected reviews
 * yet, so there was nothing honest to swap in.
 *
 * WHY THIS IS A BETTER SECTION, NOT A CONSOLATION PRIZE
 *
 * For a brand whose whole argument is "organic, made here, nothing hidden", the
 * ingredient list IS the social proof. It is the one thing on the page a
 * competitor selling a similar bottle is least willing to show. And unlike a
 * review, every word of it is verifiable: these lists are Efe's own, printed on
 * the products and imported with the catalogue.
 *
 * So the section shows real ingredients, from real products, cycling.
 *
 * THE MOTION IS DOING A JOB
 *
 * Ingredients arrive staggered because the reveal is the point: the list is
 * longer and plainer than a shopper expects, and watching it fill in is what
 * makes that land. Everything else is restrained. It pauses on hover and on
 * focus so it cannot run away from someone reading, and reduced motion gets a
 * static first panel rather than a degraded animation.
 */

export type ProofItem = {
  slug: string;
  name: string;
  /** Efe's own ingredient list, as printed on the product. */
  ingredients: string[];
  priceLabel: string;
};

/** Long enough to read a full list without hurrying. */
const DWELL_MS = 7000;

export function IngredientProof({
  items,
  botanicalCount,
}: {
  items: ProofItem[];
  botanicalCount: number;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => setIndex(((next % items.length) + items.length) % items.length),
    [items.length],
  );

  /*
    setState lives in the interval callback, never in the effect body. Doing the
    latter forces a second render on every tick, and the lint rule that catches
    it has been right about this project more than once.
  */
  useEffect(() => {
    if (reduce || paused || items.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % items.length),
      DWELL_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduce, paused, items.length]);

  const active = items[index];
  if (!active) return null;

  return (
    <section
      className="on-dark relative overflow-hidden bg-forest-deep py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,var(--color-saffron-light)_0%,transparent_68%)] opacity-[0.09] blur-3xl"
      />

      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="flex items-center gap-3.5">
              <span aria-hidden className="h-px w-10 bg-gold/70" />
              <span className="eyebrow text-[0.62rem] tracking-[0.24em] text-accent-quiet">
                Nothing hidden
              </span>
            </p>

            <h2 className="mt-5 text-[clamp(1.9rem,3.6vw,2.9rem)]/[1.08]">
              Read the label
              <br />
              <span className="text-gilt">before you buy.</span>
            </h2>

            <p className="measure mt-5 text-base/7 text-paper/72">
              Every ingredient in every product, published in full. We make these
              in Accra from {botanicalCount} botanicals, and there is nothing on
              the list we would rather you did not see.
            </p>

            {/* Tabs double as the progress indicator. */}
            <ul className="mt-8 flex flex-wrap gap-2">
              {items.map((item, position) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => go(position)}
                    aria-current={position === index ? "true" : undefined}
                    className={`relative overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      position === index
                        ? "border-gold/60 text-accent-quiet"
                        : "border-paper/20 text-paper/55 hover:border-paper/40 hover:text-paper/80"
                    }`}
                  >
                    {/*
                      The fill is the timer made visible. A shopper who wants to
                      finish reading can see how long they have, and the hover
                      pause means they are never actually rushed.
                    */}
                    {position === index && !reduce && !paused && (
                      <motion.span
                        aria-hidden
                        key={`${item.slug}-${index}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: DWELL_MS / 1000, ease: "linear" }}
                        className="absolute inset-0 origin-left bg-gold/15"
                      />
                    )}
                    <span className="relative">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- the list itself ---- */}
          <div className="min-h-[19rem] rounded-3xl border border-paper/12 bg-forest/40 p-6 backdrop-blur-sm sm:min-h-[17rem] sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.slug}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: duration.base, ease: easeSoft }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-xl sm:text-2xl">{active.name}</h3>
                  <span className="stat text-sm text-accent-quiet">
                    {active.priceLabel}
                  </span>
                </div>

                <p className="eyebrow mt-5 text-[0.58rem] text-paper/45">
                  Ingredients, in full
                </p>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {active.ingredients.map((ingredient, position) => (
                    <motion.li
                      key={ingredient}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: duration.base,
                        ease: easeSoft,
                        // Capped so a long list does not take four seconds to
                        // finish arriving.
                        delay: Math.min(position * 0.045, 0.7),
                      }}
                      className="rounded-full border border-paper/15 bg-paper/[0.04] px-3 py-1.5 text-sm text-paper/85"
                    >
                      {ingredient}
                    </motion.li>
                  ))}
                </ul>

                <Link
                  href={`/shop/${active.slug}`}
                  className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent-quiet"
                >
                  See the full product
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/*
          The honest replacement for a reviews section: an invitation to leave
          one. When there are real reviews, they belong here, and this is how
          they get collected.
        */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-5 border-t border-paper/10 pt-8">
          <p className="measure text-sm/6 text-paper/60">
            Bought from us before? We publish reviews from real customers only,
            so there are none here yet. Tell us what you thought and yours could
            be the first.
          </p>
          <Link
            href="/contact?about=review"
            className="shrink-0 rounded-full border border-paper/25 px-6 py-3 text-sm font-semibold text-paper transition-colors hover:border-gold/70 hover:text-accent-quiet"
          >
            Leave a review
          </Link>
        </div>
      </Container>
    </section>
  );
}
