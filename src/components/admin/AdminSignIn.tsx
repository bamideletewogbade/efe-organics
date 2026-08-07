"use client";

import { useActionState, useEffect, useState } from "react";

import { signInAction } from "@/app/admin/actions";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Admin sign-in.
 *
 * The error message is deliberately vague and identical for every failure:
 * wrong password, unknown address, and deactivated account all read the same.
 * A form that distinguishes them tells an attacker which addresses are real.
 *
 * The email field is optional in practice. Accounts sign in with both; the
 * shared bootstrap password works with the email left blank, which is what
 * somebody setting the shop up for the first time will do.
 */
const field =
  "w-full rounded-xl border border-paper/15 bg-forest-deep px-4 py-3 text-sm text-paper transition-colors placeholder:text-paper/30 focus:border-gold focus:outline-none";

export function AdminSignIn() {
  const [state, action, pending] = useActionState(signInAction, {});
  const [showPassword, setShowPassword] = useState(false);

  /*
    A FULL page load, not a router navigation.

    The session cookie is set by the action, but the gate that decides what
    /admin renders lives in middleware, and middleware only runs on a real
    document request. `router.push` or `router.refresh` would reuse the client
    cache and leave the sign-in screen sitting there with a valid cookie behind
    it, which is exactly the bug this replaced.

    `replace` rather than `href` so the back button does not return to a login
    form the user has already passed.
  */
  useEffect(() => {
    if (state?.ok) window.location.replace("/admin");
  }, [state?.ok]);

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
          Partner Portal
        </p>
        <p className="mt-3 text-center text-sm text-paper/60">
          Sign in to your account.
        </p>

        <label className="mt-7 block">
          <span className="mb-1.5 block text-xs font-semibold text-paper/80">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoFocus
            autoComplete="username"
            placeholder="account@efeorganics.com"
            className={field}
          />
        </label>

        {/*
          The reveal toggle is not a convenience, it is an accuracy measure.

          Passwords here are handed over verbally or on WhatsApp and typed on a
          phone keyboard that autocapitalises. Without a way to see what was
          typed, the only feedback for a mistyped character is a generic "that
          combination is not right", which is indistinguishable from a wrong
          password and sends people round the reset loop for a stray capital.

          `type` is swapped rather than the field re-rendered, so the value and
          the cursor survive the toggle. The button is `tabIndex={-1}` because a
          keyboard user tabbing from password to submit should reach submit.
        */}
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-paper/80">
            Password
          </span>
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className={`${field} pr-12`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-paper/45 transition-colors hover:text-paper/80"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.2 12S6 5.2 12 5.2 21.8 12 21.8 12 18 18.8 12 18.8 2.2 12 2.2 12Z" />
                <circle cx="12" cy="12" r="3.1" />
                {showPassword && <path d="m4 20 16-16" />}
              </svg>
            </button>
          </span>
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
          {pending ? "Authenticating…" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-[0.68rem]/5 text-paper/40">
          Secure verification portal for authorized accounts.
        </p>
      </form>
    </main>
  );
}
