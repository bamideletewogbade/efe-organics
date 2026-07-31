"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { duration, easeSoft } from "@/components/motion/tokens";

/**
 * Product imagery.
 *
 * Most SKUs have one photograph and a few have three, so the component has to
 * look deliberate at both extremes rather than showing a thumbnail rail with a
 * single lonely item — with one image the rail is simply not rendered.
 *
 * The active image cross-fades rather than swapping: these are photographs of
 * the same object from different angles, and a hard cut reads as a glitch where
 * a blend reads as turning the bottle around.
 */
export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: string[];
  name: string;
  badge?: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl border border-line bg-surface-sunken">
        <span
          aria-hidden
          className="font-[family-name:var(--font-display)] text-7xl text-muted/20"
        >
          efe
        </span>
        <span className="sr-only">No photograph available for {name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-surface-sunken">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={reduce ? false : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: duration.base, ease: easeSoft }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={
                active === 0 ? name : `${name} — view ${active + 1}`
              }
              fill
              priority={active === 0}
              sizes="(min-width: 1024px) 40rem, 92vw"
              className="object-contain p-6"
            />
          </motion.div>
        </AnimatePresence>

        {badge && (
          <span className="eyebrow absolute left-4 top-4 rounded-full bg-saffron-light px-3 py-1.5 text-[0.6rem] text-forest-deep shadow-sm">
            {badge}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-3">
          {images.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={`relative block h-20 w-20 overflow-hidden rounded-xl border transition-all duration-200 ${
                  index === active
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-line opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  aria-hidden
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
