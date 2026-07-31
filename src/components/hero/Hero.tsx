"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { HeroBackdrop } from "@/components/hero/HeroBackdrop";
import { IngredientTicker } from "@/components/hero/IngredientTicker";
import { Container } from "@/components/layout/Container";
import { RevealWords } from "@/components/motion/RevealWords";
import { duration, easeSoft, fadeUpVariants } from "@/components/motion/tokens";

export type HeroStat = { value: string; label: string };

/**
 * Landing hero.
 *
 * REBUILT AROUND THE FILM. The previous version stacked a four-tile product
 * collage, a floating savings card and a stats strip beside the headline. That
 * was already busy against a flat background; over moving footage it was noise,
 * and it broke the rule that a first-time visitor should have exactly one thing
 * to read and one thing to do.
 *
 * So the hero now carries: what this is, what it costs to start, and two ways
 * in. The products moved to the rail immediately below, where a grid belongs —
 * nothing was lost, it just stopped competing with the film.
 *
 * ONE SCREEN. `min-h-svh` with the content centred and the ingredient ticker
 * pinned to the bottom edge, so "Grown with…" is visible on landing at any
 * height. `svh` rather than `vh` so a phone's collapsing URL bar does not shift
 * the layout mid-scroll.
 *
 * LANGUAGE. Plain words only — "Shop the collection", "Our story", "Free
 * delivery over…". Nothing a first-time visitor has to decode.
 */
export function Hero({
  tagline,
  promiseLead,
  promiseAccent,
  city,
  fromPrice,
  productCount,
  ingredients,
}: {
  tagline: string;
  promiseLead: string;
  promiseAccent: string;
  city: string;
  fromPrice: string;
  productCount: number;
  ingredients: string[];
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Gentle lift as the hero leaves. Small numbers — a big parallax over video
  // makes the page feel like it is lagging behind the scroll.
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, 0.35]);

  const at = (delay: number) => ({
    initial: "hidden" as const,
    animate: "visible" as const,
    variants: fadeUpVariants,
    transition: { duration: duration.slow, ease: easeSoft, delay },
  });

  return (
    <section
      ref={ref}
      className="on-dark relative isolate flex min-h-svh flex-col overflow-hidden bg-forest-deep under-header"
    >
      <HeroBackdrop />

      <Container className="relative flex flex-1 flex-col">
        <motion.div
          style={reduce ? undefined : { opacity: fade, y: copyY }}
          className="hero-tight flex flex-1 flex-col justify-center py-10"
        >
          {/* Eyebrow — a hairline and the tagline, not a bordered pill. */}
          <motion.p {...at(0.05)} className="flex items-center gap-3.5">
            <span aria-hidden className="h-px w-10 bg-gold/70" />
            <span className="eyebrow text-[0.62rem] tracking-[0.28em] text-accent-quiet">
              {tagline}
            </span>
          </motion.p>

          <h1 className="mt-5 max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)]/[0.98]">
            <RevealWords text={promiseLead} delay={0.18} />
            <br />
            <span className="text-gilt">
              <RevealWords text={promiseAccent} delay={0.42} />
            </span>
          </h1>

          <motion.p
            {...at(0.75)}
            className="measure mt-5 text-base/7 text-paper/75 sm:mt-6 sm:text-lg/8"
          >
            Handcrafted African Black Soap, herbal hair care and natural body
            care — made in {city} the traditional way.
          </motion.p>

          <motion.div
            {...at(0.86)}
            className="mt-7 flex flex-wrap gap-2.5 sm:gap-3"
          >
            <Link
              href="/shop"
              className="group relative overflow-hidden rounded-full bg-saffron-light px-6 py-3.5 font-semibold text-forest-deep shadow-[0_10px_30px_-10px_var(--color-saffron-light)] transition-all duration-200 hover:shadow-[0_16px_40px_-10px_var(--color-saffron-light)] active:scale-[0.975] sm:px-8"
            >
              <span className="relative z-10 flex items-center gap-2">
                Shop all {productCount} products
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </span>
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
              />
            </Link>

            <Link
              href="/about"
              className="rounded-full border border-paper/30 px-6 py-3.5 font-semibold text-paper backdrop-blur-sm transition-colors duration-200 hover:border-gold/70 hover:text-accent-quiet active:scale-[0.975] sm:px-8"
            >
              How it&rsquo;s made
            </Link>
          </motion.div>

          {/* One line of plain facts. Price first — it is the question a
              first-time visitor actually has. */}
          <motion.p
            {...at(0.96)}
            className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-paper/65"
          >
            <span>
              From <span className="stat text-paper">{fromPrice}</span>
            </span>
            <span aria-hidden className="h-3 w-px bg-paper/25" />
            <span>Delivered across Ghana</span>
            <span aria-hidden className="hidden h-3 w-px bg-paper/25 sm:block" />
            <span className="hidden sm:inline">Mobile money &amp; card</span>
          </motion.p>
        </motion.div>
      </Container>

      {/* Ingredient marquee — real botanicals from the catalogue, pinned to the
          section's bottom edge so it marks where the hero ends. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.slow, ease: easeSoft, delay: 1.15 }}
        className="relative mt-auto border-t border-paper/10 py-3.5 backdrop-blur-sm"
      >
        <Container>
          <div className="flex items-center gap-6">
            <span className="eyebrow hidden shrink-0 text-[0.6rem] text-accent-quiet sm:block">
              Made with
            </span>
            <IngredientTicker items={ingredients} />
          </div>
        </Container>
      </motion.div>
    </section>
  );
}
