/**
 * Typed environment access + capability flags.
 *
 * Rule (ARCHITECTURE.md §3): the app must run, build and demo with an EMPTY
 * .env.local. Nothing throws on a missing key, features check their flag and
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
    clerkPublishableKey: read("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  },

  /** Server-only. Reading these in a client component is a bug. */
  server: {
    databaseUrl: read("DATABASE_URL"),
    paystackSecretKey: read("PAYSTACK_SECRET_KEY"),
    openRouterApiKey: read("OPENROUTER_API_KEY"),
    blotatoApiKey: read("BLOTATO_API_KEY"),
    resendApiKey: read("RESEND_API_KEY"),

    /** Where "you have an order" goes. Falls back to the public brand address. */
    orderEmailTo: read("ORDER_NOTIFY_EMAIL"),
    /** Verified sender. Resend rejects anything from an unverified domain. */
    orderEmailFrom: read("ORDER_NOTIFY_FROM"),
    /**
     * The owner's WhatsApp number in international form, digits only.
     *
     * This is the fallback that always works. Email needs a verified domain and
     * a paid plan; a wa.me link needs a phone. For a business that lives in
     * WhatsApp, the link is the primary channel and the email is the backup,
     * not the other way round.
     */
    ownerWhatsapp: read("OWNER_WHATSAPP"),

    adminPassword: read("ADMIN_PASSWORD"),
    adminSessionSecret: read("ADMIN_SESSION_SECRET"),

    clerkSecretKey: read("CLERK_SECRET_KEY"),
  },
} as const;

/**
 * Capability flags. Branch on these, never on the raw key.
 * `hasPaystack` needs BOTH halves of the pair, a public key alone cannot settle.
 */
export const capabilities = {
  hasDb: Boolean(env.server.databaseUrl),
  hasPaystack: Boolean(
    env.server.paystackSecretKey && env.public.paystackPublicKey,
  ),
  hasAI: Boolean(env.server.openRouterApiKey),
  hasBlotato: Boolean(env.server.blotatoApiKey),
  hasEmail: Boolean(env.server.resendApiKey && env.server.orderEmailFrom),
  hasOwnerWhatsapp: Boolean(env.server.ownerWhatsapp),
  hasAdminPassword: Boolean(env.server.adminPassword),

  /**
   * Clerk needs BOTH halves, like Paystack. A publishable key alone renders a
   * sign-in box that cannot verify anything server-side.
   *
   * This flag is what makes the migration safe to land before the keys exist:
   * with it false the admin keeps using the scrypt password path exactly as it
   * does today, and the moment both keys appear the whole thing switches over
   * with no further code change. Shipping an auth rewrite that only works once
   * somebody pastes a secret is how a deploy locks everyone out of a live shop.
   */
  hasClerk: Boolean(
    env.server.clerkSecretKey && env.public.clerkPublishableKey,
  ),
} as const;

export type Capabilities = typeof capabilities;

/** Dev-time visibility into what is wired. Logged once on the server. */
export function describeCapabilities(): string {
  return Object.entries(capabilities)
    .map(([key, on]) => `${on ? "on " : "off"} ${key}`)
    .join("\n");
}
