"use client";

import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";

import { duration, easeSoft } from "@/components/motion/tokens";

type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "efe-theme";

/**
 * The theme store is the DOM itself — `<html data-theme>`.
 *
 * The blocking script in layout.tsx stamps that attribute before first paint,
 * so by the time React runs the answer already exists. Reading it via
 * `useSyncExternalStore` rather than mirroring it into component state avoids a
 * second source of truth (and the cascading render that `setState` inside an
 * effect causes).
 *
 * `getServerSnapshot` returns null because the server genuinely cannot know the
 * viewer's OS preference — the button renders a placeholder until hydration.
 */
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  // Keep tabs in sync when the choice changes in another one.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme | null {
  return null;
}

function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private browsing can reject writes. The DOM change still applies.
  }
  for (const listener of listeners) listener();
}

/**
 * Light/dark toggle.
 *
 * Two-state control over a three-state model (system, or an explicit choice):
 * the first click adopts the opposite of whatever is on screen, and from then on
 * the choice is explicit and persisted. A three-way switch is a confusing thing
 * to put in a shop header.
 */
export function ThemeToggle() {
  const reduce = useReducedMotion();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Holds the header's layout until hydration so nothing shifts.
  if (theme === null) {
    return <span aria-hidden className="h-9 w-9 shrink-0" />;
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
    >
      <motion.span
        key={theme}
        initial={reduce ? false : { rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: duration.base, ease: easeSoft }}
        className="block"
      >
        {dark ? (
          /* Sun — click to go light. */
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <circle cx="10" cy="10" r="3.6" />
            <path d="M10 2v1.6M10 16.4V18M2 10h1.6M16.4 10H18M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1" />
          </svg>
        ) : (
          /* Moon — click to go dark. */
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 12.4A6.8 6.8 0 0 1 7.6 4a6.8 6.8 0 1 0 8.4 8.4Z" />
          </svg>
        )}
      </motion.span>
    </button>
  );
}
