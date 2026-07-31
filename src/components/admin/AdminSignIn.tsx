"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/admin/actions";

/**
 * Admin sign-in.
 *
 * The error message is deliberately vague ("that password is not right") and
 * identical for every failure. A form that distinguishes causes is a form that
 * helps an attacker narrow the search.
 */
export function AdminSignIn() {
  const [state, action, pending] = useActionState(signInAction, {});

  return (
    <main className="flex min-h-svh items-center justify-center bg-forest-deep p-6">
      <form
        action={action}
        className="w-full max-w-sm rounded-2xl border border-gold/20 bg-forest-deep p-8"
      >
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper">
          Efe <span className="text-gold">Admin</span>
        </p>
        <p className="mt-2 text-sm text-paper/55">
          Sign in to manage the shop.
        </p>

        <label className="mt-7 block">
          <span className="mb-1.5 block text-xs font-semibold text-paper/80">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-xl border border-paper/15 bg-forest-deep px-4 py-3 text-sm text-paper transition-colors focus:border-gold focus:outline-none"
          />
        </label>

        {state?.error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-gold px-6 py-3 font-semibold text-forest-deep transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
