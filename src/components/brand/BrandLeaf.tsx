/**
 * The leaf from the Efe monogram, drawn as line art.
 *
 * This is the page's one deliberate flourish: on load the outline and veins
 * draw themselves in, then a faint fill settles behind them. It happens once,
 * on the hero only, and it is the brand's own motif rather than a generic
 * decoration. Purely decorative — hidden from assistive technology.
 *
 * Motion lives in globals.css (`.leaf-draw` / `.leaf-fill`) and is cancelled
 * outright under `prefers-reduced-motion`.
 */
export function BrandLeaf({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 130"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ ["--leaf-length" as string]: "420" }}
    >
      {/* Fill settles in behind the line art once the stroke has drawn. */}
      <path
        className="leaf-fill"
        d="M60 6C102 30 110 80 60 118C10 80 18 30 60 6Z"
        fill="currentColor"
        opacity="0.07"
      />

      <g
        className="leaf-draw"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 6C102 30 110 80 60 118C10 80 18 30 60 6Z" />
        <line x1="60" y1="14" x2="60" y2="122" />
        <path d="M60 38C70 40 78 47 83 57" />
        <path d="M60 38C50 40 42 47 37 57" />
        <path d="M60 62C69 64 76 71 80 80" />
        <path d="M60 62C51 64 44 71 40 80" />
        <path d="M60 86C67 88 72 93 76 100" />
        <path d="M60 86C53 88 48 93 44 100" />
      </g>
    </svg>
  );
}
