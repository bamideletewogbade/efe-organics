"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { ReactNode } from "react";

import { ACTION_IDLE, type ActionState } from "@/lib/action-state";

export type { ActionState };

/**
 * Admin form feedback.
 *
 * THE PROBLEM THIS EXISTS TO FIX
 *
 * Every admin form was a bare `<form action={serverAction}>`. You pressed Save,
 * the page revalidated, and the screen came back looking exactly the same. There
 * was no way to distinguish a successful save from a validation bail-out that
 * silently did nothing, and several actions do bail out silently on bad input.
 * That single gap was most of why the back office felt unfinished: not that it
 * looked plain, but that it never answered you.
 *
 * So there are two pieces here and they are deliberately separable:
 *
 *   `SubmitButton`  knows only that the form is in flight. It uses
 *                   `useFormStatus`, which reads the nearest parent form, so it
 *                   works inside ANY form with no wiring at all. Correct for
 *                   toggles and destructive one-click buttons where "it is
 *                   working" is the only feedback needed.
 *
 *   `ActionForm`    additionally shows what happened afterwards. It needs the
 *                   action to return an `ActionState`, so it is used on the
 *                   forms where a save can fail or where the result is not
 *                   visible on screen.
 *
 * Splitting them means a toggle does not have to adopt a state machine just to
 * show a spinner.
 */

/**
 * Submit button that reports its own progress.
 *
 * Disabled while pending, which also prevents the double-submit that turns one
 * stock adjustment into two.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "quiet" | "small" | "danger";
  className?: string;
  /** For forms that are incomplete rather than in flight. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  const styles = {
    primary:
      "rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper hover:bg-forest-mid",
    quiet:
      "rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-strong hover:border-accent/50",
    small:
      "rounded-lg bg-forest px-3.5 py-2 text-xs font-semibold text-paper hover:bg-forest-mid",
    danger:
      "rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-[var(--blocked)] hover:text-[var(--blocked)]",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`inline-flex items-center gap-2 transition-all disabled:opacity-50 ${
        pending ? "cursor-progress" : "disabled:cursor-not-allowed"
      } ${styles} ${className}`}
    >
      {pending && (
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
      {pending ? (pendingLabel ?? "Saving") : children}
    </button>
  );
}

/**
 * Form that says what happened.
 *
 * The confirmation clears itself after a few seconds; an error does not, because
 * a message telling you something failed should not vanish before you have read
 * it. Both are announced politely to assistive tech, since a visual flash is no
 * feedback at all to a screen reader.
 */
export function ActionForm({
  action,
  children,
  className = "",
  successLabel = "Saved",
  /** Clears the inputs on success. For "add one more" forms. */
  resetOnSuccess = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  successLabel?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, ACTION_IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const reduce = useReducedMotion();

  /**
   * Visibility is DERIVED, not stored.
   *
   * The obvious version sets a `visible` flag from an effect when the state
   * changes, and it is wrong: setting state synchronously inside an effect
   * triggers a second render pass on every save. `useActionState` hands back a
   * new object for each submission, so identity alone answers "have I already
   * dismissed this result", and the only thing left for an effect is the timer.
   */
  const [dismissed, setDismissed] = useState<ActionState | null>(null);
  const settled = Boolean(state.ok || state.error);
  const visible = settled && dismissed !== state;

  useEffect(() => {
    // Errors stay until the next submission. A message telling you something
    // failed should not disappear before it has been read.
    if (!state.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    const timer = setTimeout(() => setDismissed(state), 3200);
    return () => clearTimeout(timer);
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}

      <div aria-live="polite" className="min-h-0">
        <AnimatePresence>
          {visible && (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                state.error ? "text-[var(--blocked)]" : "text-[var(--live)]"
              }`}
            >
              {!state.error && (
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 8.5 3.2 3.2L13 5" />
                </svg>
              )}
              {state.error ?? state.message ?? successLabel}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
