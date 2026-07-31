import { cookies } from "next/headers";

/**
 * Admin authentication.
 *
 * Clerk is the house standard and the intended destination (ARCHITECTURE.md §1),
 * but it needs keys that do not exist yet — and an admin that cannot be locked is
 * worse than no admin. So this is a small, real session gate that works today and
 * gets replaced wholesale when Clerk lands. `getAdminSession()` is the seam: swap
 * its body, leave every page untouched.
 *
 * THE SECURITY POSTURE, STATED PLAINLY
 *
 * - `ADMIN_PASSWORD` set    → password login, HMAC-signed HttpOnly cookie.
 * - Not set, development    → open, with a loud banner. Convenience only.
 * - Not set, PRODUCTION     → **locked shut.** Every request denied.
 *
 * That last line is the important one. The obvious shortcut — "no password
 * configured, so let everyone in" — is how admin panels end up indexed by
 * Google. Missing configuration must fail closed, never open.
 *
 * The cookie is signed, not encrypted: it carries no secret, just an expiry and
 * a signature proving we issued it. HttpOnly + SameSite=Lax + Secure in prod.
 */

const COOKIE = "efe_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // one working day

function secret(): string {
  // Falls back to the password itself so there is one less thing to configure.
  // If neither exists we are in dev-open or prod-locked mode and never sign.
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Buffer.from(signature).toString("base64url");
}

/** Constant-time compare — a plain `===` on a signature leaks timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type AdminSession = {
  authenticated: boolean;
  /** True when running open in development with no password configured. */
  devBypass: boolean;
  /** Set when the deployment is misconfigured — production with no password. */
  lockedReason?: string;
};

export async function getAdminSession(): Promise<AdminSession> {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return {
        authenticated: false,
        devBypass: false,
        lockedReason:
          "ADMIN_PASSWORD is not set. The admin is locked in production until it is.",
      };
    }
    return { authenticated: true, devBypass: true };
  }

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return { authenticated: false, devBypass: false };

  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return { authenticated: false, devBypass: false };

  if (Number(expiry) < Date.now()) {
    return { authenticated: false, devBypass: false };
  }

  const expected = await sign(expiry);
  return {
    authenticated: safeEqual(signature, expected),
    devBypass: false,
  };
}

/** Verifies the password and issues the cookie. Returns false on a bad password. */
export async function signIn(candidate: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  if (!safeEqual(candidate, password)) return false;

  const expiry = String(Date.now() + MAX_AGE_SECONDS * 1000);
  const token = `${expiry}.${await sign(expiry)}`;

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
