/**
 * Typed environment access + capability flags.
 *
 * Rule (ARCHITECTURE.md §3): the app must run, build and demo with an EMPTY
 * .env.local. Nothing throws on a missing key — features check their flag and
 * fall back to a working demo path.
 *
 * Server-only values must never be read from a client component. Only the
 * `public` block is safe to reference in the browser.
 */

const read = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

export const env = {
  /** Safe in the browser. */
  public: {
    siteUrl: read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3230",
    paystackPublicKey: read("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"),
  },

  /** Server-only. Reading these in a client component is a bug. */
  server: {
    databaseUrl: read("DATABASE_URL"),
    paystackSecretKey: read("PAYSTACK_SECRET_KEY"),
    openRouterApiKey: read("OPENROUTER_API_KEY"),
    blotatoApiKey: read("BLOTATO_API_KEY"),
    resendApiKey: read("RESEND_API_KEY"),
  },
} as const;

/**
 * Capability flags. Branch on these, never on the raw key.
 * `hasPaystack` needs BOTH halves of the pair — a public key alone cannot settle.
 */
export const capabilities = {
  hasDb: Boolean(env.server.databaseUrl),
  hasPaystack: Boolean(
    env.server.paystackSecretKey && env.public.paystackPublicKey,
  ),
  hasAI: Boolean(env.server.openRouterApiKey),
  hasBlotato: Boolean(env.server.blotatoApiKey),
  hasEmail: Boolean(env.server.resendApiKey),
} as const;

export type Capabilities = typeof capabilities;

/** Dev-time visibility into what is wired. Logged once on the server. */
export function describeCapabilities(): string {
  return Object.entries(capabilities)
    .map(([key, on]) => `${on ? "on " : "off"} ${key}`)
    .join("\n");
}
