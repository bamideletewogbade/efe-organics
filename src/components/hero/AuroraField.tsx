"use client";

import { motion, useReducedMotion } from "motion/react";

import { easeInOut } from "@/components/motion/tokens";

/**
 * The hero's gradient backdrop: three soft colour fields drifting behind the
 * content, finished with a grain layer.
 *
 * Design intent — this is a botanical skincare brand, so the gradient reads as
 * light moving through leaves rather than the purple-to-blue SaaS hero. Colours
 * are drawn only from the brand palette: forest depth, a gold shaft, one leaf
 * green. Nothing here is a hue the brand does not already own.
 *
 * Performance — blurred surfaces are expensive to repaint, so:
 *   · only `transform` animates, never blur, size or colour;
 *   · durations are 20s+, so the compositor does very little per frame;
 *   · two of the three fields are gated behind `sm:` and never render on phones;
 *   · `willChange: transform` keeps each field on its own layer.
 * The grain is a static SVG data URI — animated noise is a battery fire.
 */

/* Not `as const` — Framer Motion's keyframe arrays must be mutable. */
const FIELDS: Array<{
  className: string;
  animate: { x: number[]; y: number[]; scale: number[] };
  duration: number;
  responsive: string;
}> = [
  {
    className:
      "left-[-18%] top-[-25%] h-[46rem] w-[46rem] bg-[radial-gradient(circle_at_center,var(--color-clay)_0%,transparent_62%)] opacity-45",
    animate: { x: [0, 70, -30, 0], y: [0, -50, 30, 0], scale: [1, 1.08, 0.96, 1] },
    duration: 26,
    responsive: "",
  },
  {
    className:
      "right-[-14%] top-[-32%] h-[40rem] w-[40rem] bg-[radial-gradient(circle_at_center,var(--color-gold)_0%,transparent_60%)] opacity-25",
    animate: { x: [0, -60, 40, 0], y: [0, 60, -20, 0], scale: [1, 0.94, 1.06, 1] },
    duration: 32,
    responsive: "hidden sm:block",
  },
  {
    className:
      "bottom-[-40%] left-[38%] h-[34rem] w-[34rem] bg-[radial-gradient(circle_at_center,var(--color-saffron-light)_0%,transparent_65%)] opacity-[0.14]",
    animate: { x: [0, 50, -40, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.98, 1] },
    duration: 38,
    responsive: "hidden sm:block",
  },
];

/* Fine grain. Keeps the gradients from looking like flat CSS. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export function AuroraField() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {FIELDS.map((field, index) => (
        <motion.div
          key={index}
          className={`absolute rounded-full blur-3xl ${field.className} ${field.responsive}`}
          style={{ willChange: "transform" }}
          animate={reduce ? undefined : field.animate}
          transition={{
            duration: field.duration,
            ease: easeInOut,
            repeat: Infinity,
            repeatType: "loop",
          }}
        />
      ))}

      {/* Grain, then a vertical scrim so the headline always has contrast to
          sit on regardless of where the fields happen to have drifted. */}
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-forest-deep/45 via-transparent to-forest-deep/65" />
    </div>
  );
}
