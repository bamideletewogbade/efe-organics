"use client";

import { motion, useReducedMotion } from "motion/react";

import { Container } from "@/components/layout/Container";
import { duration, easeSoft } from "@/components/motion/tokens";
import { PLACEHOLDER, TESTIMONIALS } from "@/lib/testimonials";

/**
 * Testimonials.
 *
 * The design is finished; the CONTENT is not, and the component is honest about
 * that. Efe has no collected reviews, and every product on the reseller shows
 * zero, so `PLACEHOLDER` in lib/testimonials.ts is true and the section renders a
 * visible "sample content" marker. Invented reviews attributed to customers of
 * a real business are fabricated social proof, and shipping them quietly would
 * be worse than shipping nothing.
 *
 * Remove the marker by collecting real reviews and flipping the flag.
 */
export function Testimonials() {
  const reduce = useReducedMotion();

  return (
    <section className="on-dark relative overflow-hidden bg-forest-deep py-24">
      {/* One soft leaf bloom, static. This section is about the words. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--color-saffron-light)_0%,transparent_70%)] opacity-[0.10] blur-3xl"
      />

      <Container className="relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-accent">In their words</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              Skin and hair, visibly better
            </h2>
          </div>

          {PLACEHOLDER && (
            <p className="rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-xs text-gold">
              Sample content, real reviews not yet collected
            </p>
          )}
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.li
              key={index}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: duration.slow,
                ease: easeSoft,
                delay: index * 0.09,
              }}
              className="group relative flex flex-col rounded-2xl border border-paper/10 bg-paper/[0.04] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-saffron/35 hover:bg-paper/[0.07]"
            >
              {/* Oversized quote mark, in the display face. */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-5 top-1 font-[family-name:var(--font-display)] text-7xl leading-none text-saffron/15 transition-colors duration-300 group-hover:text-saffron/25"
              >
                &rdquo;
              </span>

              <div
                className="flex gap-0.5 text-accent"
                aria-label={`${testimonial.rating} out of 5`}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <svg
                    key={i}
                    viewBox="0 0 20 20"
                    aria-hidden
                    className={`h-4 w-4 ${i < testimonial.rating ? "" : "text-paper/20"}`}
                    fill="currentColor"
                  >
                    <path d="m10 1.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8Z" />
                  </svg>
                ))}
              </div>

              <blockquote className="mt-5 flex-1 text-[0.95rem]/7 text-paper/80">
                {testimonial.quote}
              </blockquote>

              <footer className="mt-6 border-t border-paper/10 pt-4">
                <p className="text-sm font-semibold text-paper">
                  {testimonial.name}
                </p>
                <p className="mt-0.5 text-xs text-paper/45">
                  {testimonial.role}
                </p>
              </footer>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
