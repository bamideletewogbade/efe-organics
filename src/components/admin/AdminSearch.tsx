"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The admin's one search box.
 *
 * WHY A PLAIN FORM AND NOT A COMMAND PALETTE
 *
 * A palette that fetches as you type is the fashionable answer and the wrong one
 * here: it needs a debounce, a race guard, a loading state and a keyboard
 * roving-focus implementation, and the shop has 42 products. A form that
 * navigates to a results page is instant on this data, works with the back
 * button, is linkable, and needs none of that machinery.
 *
 * The "/" shortcut is the one palette convenience worth keeping, because the
 * whole point is not moving your hands to the mouse. It is ignored while you are
 * already typing somewhere, otherwise it would eat the slash in a URL field.
 */
export function AdminSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = new FormData(event.currentTarget).get("q");
        const trimmed = String(query ?? "").trim();
        if (!trimmed) return;
        router.push(`/admin/search?q=${encodeURIComponent(trimmed)}`);
      }}
      className="relative"
    >
      <label htmlFor="admin-search" className="sr-only">
        Search products, orders and customers
      </label>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <input
        id="admin-search"
        ref={inputRef}
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search"
        className="w-full rounded-lg border border-paper/15 bg-paper/5 py-2 pl-9 pr-8 text-sm text-paper placeholder:text-paper/40 focus:border-gold focus:outline-none"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-paper/15 px-1.5 py-0.5 text-[0.6rem] text-paper/40 lg:block"
      >
        /
      </kbd>
    </form>
  );
}
