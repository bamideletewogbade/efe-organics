/**
 * Admin session token — verification only, edge-safe.
 *
 * Deliberately free of `next/headers` so it can run in `proxy.ts` (Next 16's
 * middleware) as well as in server components. The middleware is the real gate:
 * it runs BEFORE any page renders, which is the only place a guard actually
 * prevents work from happening.
 *
 * Everything here uses Web Crypto, available in both the edge and node runtimes.
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
  // btoa-based base64url so this works identically on edge and node.
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Constant-time compare — `===` on a signature leaks timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return false;
  if (Number(expiry) < Date.now()) return false;
  return safeEqual(signature, await signPayload(expiry));
}

export function makeToken(): Promise<string> {
  const expiry = String(Date.now() + ADMIN_MAX_AGE_SECONDS * 1000);
  return signPayload(expiry).then((sig) => `${expiry}.${sig}`);
}

/**
 * The three states, in one place so `proxy.ts` and the layout cannot disagree.
 * Missing configuration in production is LOCKED, never open.
 */
export type AdminGate = "open" | "dev-bypass" | "needs-password" | "locked";

export async function evaluateGate(
  token: string | undefined,
  isProduction: boolean,
): Promise<AdminGate> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return isProduction ? "locked" : "dev-bypass";
  return (await isValidToken(token)) ? "open" : "needs-password";
}
