"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

import { duration, easeSoft } from "@/components/motion/tokens";

/**
 * The About masthead image.
 *
 * WHAT THIS REPLACED, AND WHY
 *
 * The masthead used to be the gold monogram at 400px: a logo, next to a heading,
 * on a page about the brand. It said nothing the words did not already say, and
 * a first-time visitor learned nothing about what Efe actually makes.
 *
 * THE IDEA: RAW MATERIAL, THEN FINISHED PRODUCT.
 *
 * Two real photographs. Black soap crumble as it comes out of the process, and
 * a finished bottle in someone's hand. That is the whole "rooted in African
 * tradition, made for every day" headline, told in pictures instead of restated
 * in a caption. The pairing is also the honest version of a beauty page: it
 * shows what the product IS and what using it looks like, and claims nothing
 * about what it will do to your skin.
 *
 * BOTH IMAGES ARE REAL, FROM THE IMPORTED SET. Nothing here is generated, and
 * nothing implies a result. See public/products/README.md for the rights
 * position on this photography, which is still unresolved.
 *
 * MOTION. The two plates move at different scroll rates, which is what makes a
 * flat pair of rectangles read as depth. The numbers are small: a strong
 * parallax on a masthead makes the page feel like it is lagging behind the
 * scroll, which was already learned on the home hero.
 */

export type StoryShot = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** How long each raw-material shot holds before the next one fades in. */
const CYCLE_MS = 4200;

export function StoryComposition({
  portrait,
  textures,
  caption,
}: {
  /** The tall plate. A person, or the product in use. Deliberately still. */
  portrait: StoryShot & { href?: string; label?: string };
  /**
   * The small overlapping plate, which cycles.
   *
   * THIS IS THE HONEST VERSION OF A BEFORE AND AFTER.
   *
   * The obvious idea for a beauty page is one face before the product and one
   * after. It is also a fabricated claim: the person in the photograph never
   * used the product, and a cosmetic result nobody measured is not something to
   * illustrate. Certification and approved claims are still open questions on
   * this project, which makes it a bad thing to imply by accident.
   *
   * So the transformation shown is the SOAP'S, not somebody's skin. Ash and
   * butter, then crumble, then the finished bottle in a hand. Same emotional
   * beat, entirely true, and it happens to be what the section is actually
   * about.
   */
  textures: Array<StoryShot & { label?: string }>;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [shot, setShot] = useState(0);

  /*
    Motion lives in the small plate only. A hero that cycles its main image
    pulls the eye away from the headline every few seconds, which is exactly the
    "cool but distracting" failure. A quiet corner that changes is noticed
    without competing.

    setState inside the interval callback, never in the effect body: doing the
    latter triggers a second render on every tick and the lint rule that catches
    it has been right about this project three times already.
  */
  useEffect(() => {
    if (reduce || textures.length < 2) return;
    const timer = window.setInterval(
      () => setShot((current) => (current + 1) % textures.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduce, textures.length]);

  const active = textures[shot] ?? textures[0];

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const portraitY = useTransform(scrollYProgress, [0, 1], ["4%", "-6%"]);
  const textureY = useTransform(scrollYProgress, [0, 1], ["14%", "-16%"]);

  const frame =
    "relative overflow-hidden rounded-2xl ring-1 ring-gold/25 shadow-[0_30px_70px_-30px_rgb(0_0_0_/_0.75)]";

  return (
    /*
      SIZED AGAINST THE VIEWPORT, NOT THE COLUMN.

      This was `aspect-[3/4] w-full` with no cap, inside a grid column about
      40rem wide on a laptop. Three-quarters of 40rem is a 53rem tall image, so
      the masthead grew to whatever the layout gave it and pushed itself off the
      bottom of the screen. Width-driven sizing is the standard way a hero image
      quietly breaks a one-screen layout.

      `max-h` in `svh` makes the viewport the constraint instead. The aspect
      ratio still governs on narrow screens where height is plentiful, and gives
      way on wide ones where it is not. `object-cover` absorbs the difference.
    */
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[22rem] sm:max-w-[24rem] lg:max-w-[27rem]"
    >
      {/* Warm bloom behind, so the plates sit in light rather than on flat green. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(circle,var(--color-saffron-light)_0%,transparent_68%)] opacity-[0.10] blur-3xl"
      />

      <div className="relative pb-12 pl-0 sm:pb-14 sm:pl-12">
        {/* ---- the tall plate ---- */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.slow, ease: easeSoft, delay: 0.15 }}
          style={reduce ? undefined : { y: portraitY }}
          className={`${frame} aspect-[3/4] max-h-[52svh] w-full lg:max-h-[54svh]`}
        >
          <Image
            src={portrait.src}
            alt={portrait.alt}
            fill
            priority
            sizes="(min-width: 1024px) 34rem, (min-width: 640px) 26rem, 90vw"
            className="object-cover"
          />
          {/*
            Foot gradient so the caption is readable whatever the photo does.
            Deepened from 65% because this particular shot is a bright gold
            bathroom and white-on-dim was washing out against it. A caption that
            depends on the photograph being dark is a caption that disappears
            the first time the photograph changes.
          */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />

          {portrait.label &&
            (portrait.href ? (
              <Link
                href={portrait.href}
                className="group absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-xl bg-black/55 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-black/50"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-white">
                  {portrait.label}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-xs text-[var(--color-gold-light,#e4cf8e)] transition-transform group-hover:translate-x-0.5"
                >
                  Shop it &rarr;
                </span>
              </Link>
            ) : (
              <span className="absolute bottom-4 left-4 rounded-xl bg-black/55 px-4 py-2.5 ring-1 ring-white/10 text-sm font-semibold text-white backdrop-blur-md">
                {portrait.label}
              </span>
            ))}
        </motion.div>

        {/* ---- the small overlapping plate ---- */}
        <motion.figure
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.slow, ease: easeSoft, delay: 0.35 }}
          style={reduce ? undefined : { y: textureY }}
          className="absolute -bottom-1 left-0 w-[44%] max-w-[11rem] sm:-bottom-2"
        >
          <div className={`${frame} aspect-square w-full`}>
            {/*
              Crossfade with `mode="popLayout"` omitted on purpose: the outgoing
              and incoming plates must overlap, otherwise the frame is empty for
              a beat and the whole thing flickers.
            */}
            <AnimatePresence initial={false}>
              <motion.div
                key={active.src}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: easeSoft }}
                className="absolute inset-0"
              >
                <Image
                  src={active.src}
                  alt={active.alt}
                  fill
                  sizes="(min-width: 640px) 11rem, 44vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress ticks. Small, and the only thing that says the plate is
              going to change, which stops the first fade reading as a glitch. */}
          {textures.length > 1 && !reduce && (
            <div
              aria-hidden
              className="mt-2.5 flex items-center gap-1.5"
            >
              {textures.map((item, index) => (
                <span
                  key={item.src}
                  className={`h-px flex-1 transition-colors duration-500 ${
                    index === shot ? "bg-gold/70" : "bg-paper/15"
                  }`}
                />
              ))}
            </div>
          )}

          {active.label && (
            <figcaption
              className={`text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-accent-quiet ${
                textures.length > 1 && !reduce ? "mt-2" : "mt-2.5"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={active.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35, ease: easeSoft }}
                  className="block"
                >
                  {active.label}
                </motion.span>
              </AnimatePresence>
            </figcaption>
          )}
        </motion.figure>
      </div>

      {caption && (
        <p className="mt-3 pl-0 text-xs/5 text-paper/50 sm:pl-14">{caption}</p>
      )}
    </div>
  );
}
