/**
 * Admin session token. Verification only, edge-safe.
 *
 * Deliberately free of `next/headers` so it can run in `proxy.ts` (Next 16's
 * middleware) as well as in server components. The middleware is the real gate:
 * it runs BEFORE any page renders, which is the only place a guard actually
 * prevents work from happening.
 *
 * Everything here uses Web Crypto, available in both the edge and node runtimes.
 * Nothing here touches the database or scrypt, both of which are Node-only. The
 * edge checks a signature and nothing more; who you are is read from the signed
 * payload rather than looked up.
 *
 * THE PAYLOAD FORMAT MUST MATCH lib/admin-auth.ts EXACTLY.
 *
 * `expiry|userId|email|role` followed by `.` and the signature over all of it.
 * The whole payload is signed, not just the expiry, so the role inside a cookie
 * cannot be edited to grant somebody ownership of the shop.
 */

export const ADMIN_COOKIE = "efe_admin";
export const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

export async function signPayload(value: string): Promise<string> {
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
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Constant-time compare, `===` on a signature leaks timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token || !secret()) return false;

  // Split on the LAST dot: the payload is structured and could in principle
  // contain one, the signature is base64url and never can.
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiry = Number(payload.split("|")[0]);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  return safeEqual(signature, await signPayload(payload));
}

/**
 * The three states, in one place so `proxy.ts` and the layout cannot disagree.
 * Missing configuration in production is LOCKED, never open.
 *
 * A database counts as configuration: once `admin_users` exists somebody can
 * sign in with an account, so a deployment with `DATABASE_URL` and no
 * `ADMIN_PASSWORD` should show the sign-in form rather than declaring itself
 * broken.
 */
export type AdminGate = "open" | "dev-bypass" | "needs-password" | "locked";

export async function evaluateGate(
  token: string | undefined,
  isProduction: boolean,
): Promise<AdminGate> {
  const canAuthenticate = Boolean(
    process.env.ADMIN_PASSWORD ?? process.env.DATABASE_URL,
  );

  if (!canAuthenticate) return isProduction ? "locked" : "dev-bypass";
  if (!secret()) return isProduction ? "locked" : "dev-bypass";

  return (await isValidToken(token)) ? "open" : "needs-password";
}
