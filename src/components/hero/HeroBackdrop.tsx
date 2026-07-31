"use client";

import { useSyncExternalStore } from "react";

/**
 * The hero's video backdrop.
 *
 * SOURCE: 66s of brand footage (heritage → traditional soap-making → product).
 * The loop is a 10.6s window starting at 14.6s — chosen because ffmpeg scene
 * detection showed it as the longest CONTINUOUS shot in the film. A loop with a
 * cut inside it reads as a glitch. The original's black flicker (three bursts
 * inside the first 0.78s) is trimmed away entirely.
 *
 * 290MB master → 1.3MB wide / 0.6MB tall. H.264 only: VP9 encoded LARGER here
 * (1.9MB vs 1.3MB) because grain defeats it, so shipping WebM would have cost
 * users bandwidth for nothing.
 *
 * WHY IT IS NOT ALWAYS ON — three cases fall back to the poster:
 *
 * 1. **Save-Data or a 2G connection.** The audience is on Ghanaian mobile data.
 *    Pushing 1.3MB of decoration at someone on a metered connection to sell
 *    GH₵15 soap is a bad trade, and the Network Information API tells us.
 * 2. **`prefers-reduced-motion`.** Persistent background movement is a real
 *    problem for vestibular disorders, and this is decoration.
 * 3. **Before hydration.** `getServerSnapshot` returns null, so the server sends
 *    the poster and the video is never in the critical path.
 *
 * Read through `useSyncExternalStore` rather than an effect: media queries ARE
 * an external store, and subscribing means rotating a phone re-picks the right
 * crop instead of keeping a landscape file on a portrait screen.
 */

const WIDE = "/video/hero-wide.mp4";
const TALL = "/video/hero-tall.mp4";
const POSTER = "/video/hero-poster.jpg";

/**
 * WHICH FILE, decided ONCE per page load and then frozen.
 *
 * An earlier version re-picked the crop whenever the viewport crossed 640px.
 * That was over-engineering, and testing it showed why: swapping `src` mid-
 * session downloads a SECOND 1.3MB file — on the connection this component
 * exists to be careful about — to gain framing that `object-cover` already
 * handles correctly at any aspect ratio. Rotating a phone would have cost a
 * megabyte for nothing.
 *
 * So the size choice is frozen after the first client read. What is NOT frozen
 * is `prefers-reduced-motion`: that is an accessibility preference, and if
 * someone turns it on mid-session the video should stop immediately.
 *
 * The MediaQueryList objects are cached at module scope because building them
 * fresh in both `subscribe` and `getSnapshot` handed `removeEventListener` a
 * different object than `addEventListener` got, so cleanup silently did nothing.
 */
let motionQuery: MediaQueryList | null = null;
let frozenSize: string | null = null;

function motion(): MediaQueryList {
  motionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return motionQuery;
}

function subscribe(onChange: () => void) {
  const query = motion();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): string | null {
  if (motion().matches) return null;

  // `connection` is Chromium-only; absent means assume a good connection.
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (
    connection?.saveData === true ||
    ["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
  ) {
    return null;
  }

  frozenSize ??= window.matchMedia("(min-width: 640px)").matches ? WIDE : TALL;
  return frozenSize;
}

const getServerSnapshot = () => null;

export function HeroBackdrop() {
  const src = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 overflow-hidden bg-forest-deep"
    >
      {/* The poster is always painted, so there is never an empty rectangle —
          the fallback is the same picture, just not moving. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${POSTER})` }}
      />

      {src && (
        <video
          key={src}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={POSTER}
          onCanPlay={(event) =>
            event.currentTarget.classList.replace("opacity-0", "opacity-100")
          }
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-1000"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/*
        Three stacked scrims rather than one flat black. A single 60% overlay
        dulls the footage everywhere; this darkens hardest where the text sits
        and lets the imagery stay legible elsewhere, so it reads as lighting
        rather than a filter.
      */}
      <div className="absolute inset-0 bg-forest-deep/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest-deep via-forest-deep/75 to-forest-deep/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-transparent to-forest-deep/55" />
    </div>
  );
}
