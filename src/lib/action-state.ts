/**
 * What every admin server action returns.
 *
 * Lives in its own module because a `"use server"` file may only export async
 * functions, so the type cannot be declared alongside the actions that produce
 * it, and a client component importing it from there would drag a server module
 * into the browser bundle.
 *
 * `ok` without a `message` renders the form's default confirmation, which keeps
 * the common case to `return { ok: true }`.
 */
export type ActionState = {
  ok?: boolean;
  /** Replaces the default confirmation. Use when the outcome needs explaining. */
  message?: string;
  /** Shown instead of a confirmation and does not auto-dismiss. */
  error?: string;
};

export const ACTION_IDLE: ActionState = {};
