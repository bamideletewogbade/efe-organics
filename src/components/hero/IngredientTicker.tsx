/**
 * A slow marquee of the botanicals actually in the range.
 *
 * This earns its place because the content is true — every name is parsed out of
 * a real ingredient list in the catalogue. For an organic skincare brand the
 * ingredient list *is* the pitch, so putting it in motion at the foot of the
 * hero says more than another line of marketing copy would.
 *
 * The loop is a CSS animation rather than Framer Motion, on purpose. It is a
 * linear infinite translate — the one case where CSS is strictly better: it runs
 * off the main thread, and `animation-play-state: paused` stops it on hover so
 * the names can actually be read. Motion drives transforms from JavaScript,
 * where there is no play state to pause. See `.marquee-track` in globals.css.
 *
 * The list is rendered twice and the track translates exactly -50%, so the seam
 * is invisible with no measurement. The duplicate is hidden from screen readers.
 * No client component needed — this is static markup.
 */
export function IngredientTicker({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="marquee group relative overflow-hidden"
      aria-label="Botanicals in our range"
    >
      <ul className="marquee-track flex w-max items-center gap-8 py-1">
        {[...items, ...items].map((item, index) => (
          <li
            key={`${item}-${index}`}
            aria-hidden={index >= items.length}
            className="flex shrink-0 items-center gap-8 whitespace-nowrap text-sm text-paper/55"
          >
            {item}
            <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden />
          </li>
        ))}
      </ul>

      {/* Feather both ends so names emerge and dissolve rather than clipping. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-forest-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-forest-deep to-transparent" />
    </div>
  );
}
