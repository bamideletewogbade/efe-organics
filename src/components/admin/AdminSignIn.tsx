"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/admin/actions";
import { Wordmark } from "@/components/brand/Wordmark";

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
        {/* The mark gets real size here, this is the one admin screen someone
            lands on cold, so it should look unmistakably like Efe before it
            asks for a password. */}
        {/* Wrapper does the centring: Wordmark's root is `inline-flex`, which
            shrink-wraps, so `justify-center` on it has nothing to distribute. */}
        <div className="flex justify-center">
          <Wordmark onDark size="large" />
        </div>

        <p className="mt-5 text-center text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-accent-quiet">
          Admin
        </p>
        <p className="mt-3 text-center text-sm text-paper/60">
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

        {/* This plate is always dark, so the dark-theme blocked tone is used
            directly rather than via the theme-switching token. */}
        {state?.error && (
          <p role="alert" className="mt-3 text-sm text-[#e08a72]">
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
