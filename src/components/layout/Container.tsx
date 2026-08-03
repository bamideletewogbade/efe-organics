import type { ReactNode } from "react";

/**
 * The single horizontal rhythm for the whole site. Do not hand-roll page padding.
 *
 * Width comes from `--container` (88rem) rather than a Tailwind max-w step, so
 * the measure is defined once in the token layer. The gutter scales with the
 * viewport: 1rem on a phone, 2rem from `sm`, 3rem from `lg`, a fixed 1.25rem
 * gutter looked cramped once the container went wide.
 *
 * `bleed` opts a section out of the measure entirely for full-width treatments
 * (hero media, marquees) while keeping the padding.
 */
export function Container({
  children,
  className = "",
  bleed = false,
}: {
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-8 lg:px-12 ${
        bleed ? "" : "max-w-(--container)"
      } ${className}`}
    >
      {children}
    </div>
  );
}
