"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useMotionTemplate, useReducedMotion, useSpring } from "motion/react";

import { pointerSpring } from "@/components/motion/tokens";

/**
 * Pointer-tracked 3D frame for the hero product.
 *
 * Two things track the cursor: the card's tilt, and a gold specular sheen that
 * moves across it. The sheen is the point — a bare rotating rectangle reads as a
 * gimmick, but light catching a surface as you move past it reads as a physical
 * object on a shelf, which is what we want for a premium skincare product.
 *
 * Tilt is capped at 7deg. Past roughly 10deg the product photograph starts to
 * look distorted and the effect turns into a toy.
 *
 * Touch devices get nothing — there is no pointer to track, and `pointermove`
 * on touch would fight the scroll. Reduced motion gets nothing.
 */
const MAX_TILT = 7;

export function TiltFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  /**
   * Imperative springs — seeded with a plain number, not a source MotionValue.
   * `useSpring(someMotionValue)` makes the spring *track* that value, and then
   * `.set()` on the spring gets overridden on the next source update. Seeding
   * with a number is the pattern that lets us drive it from the pointer handler.
   */
  const rotateX = useSpring(0, pointerSpring);
  const rotateY = useSpring(0, pointerSpring);
  const sheenX = useSpring(50, pointerSpring);
  const sheenY = useSpring(0, pointerSpring);

  const sheen = useMotionTemplate`radial-gradient(38rem circle at ${sheenX}% ${sheenY}%, rgb(201 168 76 / 0.30), transparent 62%)`;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;

    rotateY.set(nx * MAX_TILT * 2);
    rotateX.set(-ny * MAX_TILT * 2);
    sheenX.set((nx + 0.5) * 100);
    sheenY.set((ny + 0.5) * 100);
  }

  function handlePointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
    sheenX.set(50);
    sheenY.set(0);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`[perspective:1100px] ${className}`}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        className="relative"
      >
        {children}

        {/* Specular sheen. Above the photograph, below any content. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-(--radius-card) mix-blend-soft-light"
          style={{ backgroundImage: reduce ? undefined : sheen }}
        />
      </motion.div>
    </div>
  );
}
