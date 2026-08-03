"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useRef } from "react";

import { duration, easeSoft, pointerSpring } from "@/components/motion/tokens";

export type CollageItem = {
  slug: string;
  name: string;
  image: string;
  tall?: boolean;
  badge?: string;
};

/**
 * The hero's product collage.
 *
 * A staggered four-up grid rather than one big shot, because the range is the
 * story: Efe sells 41 products across six categories, and a single bottle
 * undersells that. The tiles are different heights so the block reads as a
 * composition rather than a table.
 *
 * Motion, in order of how much it matters:
 *   · tiles arrive on a diagonal (top-left first), so the eye lands where the
 *     copy ends and travels naturally across the block;
 *   · the whole block tilts a few degrees toward the pointer, sharing one
 *     perspective so the four tiles feel like one object, not four cards;
 *   · each tile lifts and its photograph scales slightly on hover.
 *
 * Tilt is disabled for touch and for reduced motion.
 */
const MAX_TILT = 5;

export function ProductCollage({ items }: { items: CollageItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const rotateX = useSpring(0, pointerSpring);
  const rotateY = useSpring(0, pointerSpring);
  const glowX = useSpring(50, pointerSpring);
  const glowY = useSpring(50, pointerSpring);

  const glow = useMotionTemplate`radial-gradient(30rem circle at ${glowX}% ${glowY}%, rgb(163 193 100 / 0.20), transparent 60%)`;

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(nx * MAX_TILT * 2);
    rotateX.set(-ny * MAX_TILT * 2);
    glowX.set((nx + 0.5) * 100);
    glowY.set((ny + 0.5) * 100);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
    glowX.set(50);
    glowY.set(50);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      /**
       * Height-bounded, not aspect-driven.
       *
       * The tiles used to be fixed 4:5, so the block was as tall as its columns
       * were wide, ~750px on a laptop, which made the hero overflow any
       * viewport under about 900px no matter how much padding came out.
       *
       * Now the collage is capped in `svh` and the tiles divide whatever height
       * is available, so the hero fits the screen instead of the screen having
       * to fit the hero.
       */
      /**
       * The cap is tighter on phones because the hero STACKS there, copy and
       * collage share one column instead of sitting side by side, so the collage
       * competes with the headline for the same vertical budget rather than
       * running alongside it. 34svh keeps all four products legible while
       * leaving the ticker above the fold.
       */
      className="relative h-full max-h-[34svh] min-h-[13rem] sm:max-h-[62svh] sm:min-h-[16rem] [perspective:1400px]"
    >
      {/* Leaf-green bloom behind the grid, tracking the pointer. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full blur-2xl"
        style={{ backgroundImage: reduce ? undefined : glow }}
      />

      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        /**
         * Two independent columns rather than a 4-cell grid with row spans.
         * A grid equalises row heights, so mixed aspect ratios leave gaps; two
         * columns let each tile keep its own ratio, and offsetting the right
         * column produces the staggered composition. Every tile keeps a fixed
         * 4:5 aspect so nothing crops unpredictably.
         */
        className="grid h-full grid-cols-2 gap-3 sm:gap-4"
      >
        {[items.slice(0, 2), items.slice(2, 4)].map((column, columnIndex) => (
          <div
            key={columnIndex}
            /* `pt` on the offset column rather than `mt`: margin would push the
               column past the container's height and reintroduce the overflow
               this layout exists to prevent. */
            className={`flex h-full min-h-0 flex-col gap-3 sm:gap-4 ${
              columnIndex === 1 ? "pt-6 sm:pt-10" : "pb-6 sm:pb-10"
            }`}
          >
            {column.map((item, rowIndex) => {
              const index = columnIndex * 2 + rowIndex;
              return (
                <motion.div
                  key={item.slug}
                  initial={reduce ? false : { opacity: 0, y: 30, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.75,
                    ease: easeSoft,
                    // Diagonal cascade. Top-left first, bottom-right last.
                    delay: 0.3 + columnIndex * 0.09 + rowIndex * 0.11,
                  }}
                  /* Each tile takes an equal share of the column's height.
                     `min-h-0` is required, without it a flex child refuses to
                     shrink below its content and the cap is ignored. */
                  className="min-h-0 flex-1"
                >
                  <Link
                    href={`/shop/${item.slug}`}
                    className="group relative block h-full overflow-hidden rounded-2xl bg-paper ring-1 ring-paper/15 transition-all duration-300 hover:ring-saffron/50 hover:shadow-[0_20px_50px_-20px_rgb(217_143_20_/_0.45)]"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      priority={index < 2}
                      sizes="(min-width: 1024px) 18rem, (min-width: 640px) 24vw, 44vw"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />

                    {item.badge && (
                      <span className="eyebrow absolute right-2.5 top-2.5 rounded-full bg-saffron-light px-2.5 py-1 text-[0.55rem] text-forest-deep">
                        {item.badge}
                      </span>
                    )}

                    {/* Name only surfaces on hover, the tiles should read as imagery
                  first, not as a product list. */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-forest-deep/95 to-transparent px-3 pb-2.5 pt-8 text-xs text-paper transition-transform duration-300 ease-out group-hover:translate-y-0">
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** Floating savings card. Sits over the collage; content is real. */
export function SavingsCard({
  percent,
  delay = 1.0,
}: {
  percent: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: duration.slow, ease: easeSoft, delay }}
      className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-2xl bg-paper/95 px-5 py-4 shadow-2xl backdrop-blur sm:-left-10"
    >
      <p className="flex items-center gap-1.5 text-xs text-clay">
        <span className="h-1.5 w-1.5 rounded-full bg-saffron-light" aria-hidden />
        Save up to
      </p>
      <p className="stat mt-1 text-3xl leading-none text-accent">
        {percent}%
      </p>
      <p className="mt-1 text-[0.7rem] text-clay">vs. listed retail</p>
    </motion.div>
  );
}
