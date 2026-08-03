import Image from "next/image";

import { brand } from "@/lib/brand";

/**
 * The Efe Organics mark.
 *
 * **The mark stands alone.** An earlier version set "efe organics / Life &
 * Organics" in type beside it, which was the actual reason the header looked
 * wrong: the artwork already contains the word ORGANICS under the monogram, so
 * the header was saying the brand name twice and cramming a detailed gold script
 * into 36px next to competing text. Shrinking an ornate script until it fits
 * beside a wordmark is how you make an expensive logo look cheap.
 *
 * So: no adjacent type, and the mark gets real size (48px in the bar, 56px on
 * desktop). It is legible, it is the client's actual artwork, and it is what
 * every premium beauty brand does with a monogram this decorative.
 *
 * Two variants exist because the masters are JPEGs with no alpha,
 * `scripts/generate-brand-assets.mjs` keys each against its own background, so
 * each one's anti-aliased edge carries the tint of the surface it belongs on.
 */
export function Wordmark({
  className = "",
  onDark = false,
  size = "bar",
}: {
  className?: string;
  /** True on forest-deep plates. The site header, the footer. */
  onDark?: boolean;
  /** `bar` for the header; `large` for footers and mastheads. */
  size?: "bar" | "large";
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={onDark ? "/brand/mark-on-dark.png" : "/brand/mark-on-light.png"}
        alt=""
        aria-hidden
        width={633}
        height={512}
        priority
        sizes={size === "bar" ? "72px" : "160px"}
        className={
          size === "bar"
            ? "h-11 w-auto sm:h-14"
            : "h-20 w-auto sm:h-24"
        }
      />
      {/* The mark is the name, a screen reader should hear it once. */}
      <span className="sr-only">{brand.name}</span>
    </span>
  );
}
