import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared admin furniture.
 *
 * Every admin screen was inventing its own header, its own empty state and its
 * own idea of a card. That inconsistency is most of why the back office read as
 * bland: nothing repeated, so nothing felt designed, it looked like five pages
 * built by five people.
 *
 * These are deliberately plain components. An admin is scanned and operated, not
 * read, so the craft goes into information design, state you can see at a
 * glance, numbers that line up, one obvious action per screen, rather than
 * decoration.
 */

/** Page title, one line of orientation, and the screen's primary action. */
export function PageHeader({
  title,
  description,
  action,
  meta,
}: {
  /** Usually a string. A node so a reference can carry the `.ref` face. */
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  /** Small facts that belong beside the title, e.g. "41 products · 6 ranges". */
  meta?: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl text-strong sm:text-[1.75rem]">{title}</h1>
        {description && (
          <p className="measure mt-1.5 text-sm/6 text-muted">{description}</p>
        )}
        {meta && <p className="mt-2 text-xs text-muted">{meta}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/**
 * Empty state.
 *
 * Teaches rather than apologises. "No orders yet" is a dead end; "they appear
 * here the moment someone checks out" tells the reader the screen is working and
 * what will change it.
 */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface-sunken px-6 py-14 text-center">
      {/* The one place the display face still appears in the admin: it is a
          decorative mark, not a heading, so it is allowed its personality. */}
      <span
        aria-hidden
        className="mx-auto block font-[family-name:var(--font-bricolage)] text-4xl text-muted/25"
      >
        efe
      </span>
      <p className="mt-4 font-semibold text-strong">{title}</p>
      <p className="measure mx-auto mt-1.5 text-sm/6 text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** A number that matters, with its label underneath. */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "text-strong",
    good: "text-[var(--live)]",
    warn: "text-[var(--progress)]",
    bad: "text-[var(--blocked)]",
  }[tone];

  return (
    <div className="bg-surface-raised p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`stat mt-1.5 text-2xl ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Grid that hairlines its children apart without doubling borders. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface-raised p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/** Status pill. Colour is semantic and separate from the brand accent. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const tones = {
    neutral: "bg-surface-sunken text-muted",
    good: "bg-[color-mix(in_oklab,var(--live)_14%,transparent)] text-[var(--live)]",
    warn: "bg-[color-mix(in_oklab,var(--progress)_16%,transparent)] text-[var(--progress)]",
    bad: "bg-[color-mix(in_oklab,var(--blocked)_14%,transparent)] text-[var(--blocked)]",
    info: "bg-saffron/12 text-accent-quiet",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones}`}
    >
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "quiet";
}) {
  const style =
    variant === "primary"
      ? "bg-forest text-paper hover:bg-forest-mid"
      : "border border-line text-strong hover:border-accent/50";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${style}`}
    >
      {children}
    </Link>
  );
}
