import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";

/**
 * Admin authentication.
 *
 * WHY THIS CHANGED
 *
 * There was one shared `ADMIN_PASSWORD`. That works for exactly one person, and
 * it broke two things the moment a second person had it:
 *
 * 1. **The audit log became fiction.** Every row recorded actor "admin", so
 *    "who changed this price" had no answer. An audit log nobody can attribute
 *    is a table that costs storage and settles no arguments.
 * 2. **Access could not be revoked.** Removing one person's access meant
 *    changing the password and redistributing it to everyone else.
 *
 * So accounts live in `admin_users` with their own scrypt hashes, and the
 * session cookie carries who you are.
 *
 * THREE WAYS IN, IN PRIORITY ORDER
 *
 * 1. **A user account.** Email and password against `admin_users`. The real
 *    path, and the one that produces a usable audit trail.
 * 2. **The shared `ADMIN_PASSWORD`.** Kept as a deliberate bootstrap: somebody
 *    has to be able to get in and create the first account, and a system where
 *    losing the last account means editing the database by hand is a system that
 *    will one day need the database edited by hand. It signs in as "owner
 *    (shared password)" and the audit log says exactly that, so a shared login
 *    is visible in the record rather than disguised as a person.
 * 3. **Development with nothing configured.** Open, loudly.
 *
 * PRODUCTION WITH NO CONFIGURATION IS LOCKED. Taking the obvious shortcut of
 * "nothing is set up, so let everyone in" is how admin panels end up indexed by
 * Google. Missing configuration fails closed.
 *
 * THE COOKIE IS SIGNED, NOT ENCRYPTED. It carries an expiry, a user id and an
 * email, none of which are secret, plus an HMAC proving we issued it. The
 * signature covers the whole payload, so the identity inside cannot be swapped
 * for somebody else's. HttpOnly, SameSite=Lax, Secure in production.
 */

const COOKIE = "efe_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // one working day
const log = logger.child({ module: "admin-auth" });

export type AdminRole = "owner" | "manager" | "staff";

function secret(): string {
  // Falls back to the password itself so there is one less thing to configure.
  return env.server.adminSessionSecret ?? env.server.adminPassword ?? "";
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

/** Constant-time compare. A plain `===` on a signature leaks timing. */
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
  /** Set when the deployment is misconfigured, production with no password. */
  lockedReason?: string;

  /** Null for the shared password and for the dev bypass. */
  userId: string | null;
  /** Who to record in the audit log. Never null when authenticated. */
  actorEmail: string;
  role: AdminRole;
  /** True when the shared bootstrap password was used rather than an account. */
  shared: boolean;
};

const DEV_SESSION: AdminSession = {
  authenticated: true,
  devBypass: true,
  userId: null,
  actorEmail: "developer@localhost",
  role: "owner",
  shared: false,
};

const DENIED: AdminSession = {
  authenticated: false,
  devBypass: false,
  userId: null,
  actorEmail: "",
  role: "staff",
  shared: false,
};

/**
 * The cookie payload.
 *
 * `expiry|userId|email|role` joined with a character that cannot appear in an
 * email, then signed as one string. Signing the whole payload rather than only
 * the expiry is what stops somebody editing the role in their own cookie.
 */
function encode(parts: {
  expiry: number;
  userId: string;
  email: string;
  role: AdminRole;
}): string {
  return [parts.expiry, parts.userId, parts.email, parts.role].join("|");
}

export async function getAdminSession(): Promise<AdminSession> {
  const hasAccounts = Boolean(env.server.databaseUrl);
  const hasShared = Boolean(env.server.adminPassword);

  if (!hasShared && !hasAccounts) {
    if (process.env.NODE_ENV === "production") {
      return {
        ...DENIED,
        lockedReason:
          "Neither ADMIN_PASSWORD nor DATABASE_URL is set. The admin is locked in production until one of them is.",
      };
    }
    return DEV_SESSION;
  }

  // A signing secret is required to trust any cookie at all.
  if (!secret()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ...DENIED,
        lockedReason:
          "ADMIN_SESSION_SECRET is not set, so sessions cannot be signed.",
      };
    }
    return DEV_SESSION;
  }

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return DENIED;

  const separator = token.lastIndexOf(".");
  if (separator < 0) return DENIED;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = await sign(payload);
  if (!safeEqual(signature, expected)) return DENIED;

  const [expiry, userId, email, role] = payload.split("|");
  if (!expiry || Number(expiry) < Date.now()) return DENIED;

  return {
    authenticated: true,
    devBypass: false,
    userId: userId || null,
    actorEmail: email || "admin",
    role: (role as AdminRole) || "staff",
    shared: !userId,
  };
}

async function issue(parts: {
  userId: string;
  email: string;
  role: AdminRole;
}): Promise<void> {
  const payload = encode({
    expiry: Date.now() + MAX_AGE_SECONDS * 1000,
    ...parts,
  });
  const token = `${payload}.${await sign(payload)}`;

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export type SignInResult =
  | { ok: true; mustChangePassword: boolean }
  | { ok: false };

/**
 * Verifies credentials and issues the cookie.
 *
 * The same generic failure is returned whether the account does not exist, is
 * deactivated, or the password is wrong. Distinguishing them tells an attacker
 * which emails are real.
 */
export async function signIn(
  email: string,
  candidate: string,
): Promise<SignInResult> {
  const normalisedEmail = email.trim().toLowerCase();
  const db = getDb();

  /* ---- 1. a real account ---- */
  if (db && normalisedEmail) {
    try {
      const [user] = await db
        .select()
        .from(adminUsers)
        .where(
          and(eq(adminUsers.email, normalisedEmail), eq(adminUsers.active, true)),
        );

      if (user && (await verifyPassword(candidate, user.passwordHash))) {
        // Cost factors move over time. Rewriting on a successful login is the
        // only moment the plaintext is available to do it with.
        if (needsRehash(user.passwordHash)) {
          await db
            .update(adminUsers)
            .set({ passwordHash: await hashPassword(candidate) })
            .where(eq(adminUsers.id, user.id));
        }

        await db
          .update(adminUsers)
          .set({ lastSeenAt: new Date() })
          .where(eq(adminUsers.id, user.id));

        await issue({
          userId: user.id,
          email: user.email,
          role: user.role as AdminRole,
        });
        log.info("admin signed in", { email: user.email, role: user.role });
        return { ok: true, mustChangePassword: user.mustChangePassword };
      }
    } catch (error) {
      // A missing table (migrations not run) falls through to the shared
      // password rather than locking the only person who can fix it out.
      log.warn("admin user lookup failed", { error: String(error) });
    }
  }

  /* ---- 2. the shared bootstrap password ---- */
  const shared = env.server.adminPassword;
  if (shared && safeEqual(candidate, shared)) {
    await issue({ userId: "", email: "shared-password", role: "owner" });
    log.warn("admin signed in with the shared password");
    return { ok: true, mustChangePassword: false };
  }

  log.warn("admin sign-in rejected", { email: normalisedEmail });
  return { ok: false };
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Role ranking, so a check reads as "at least a manager". */
const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function atLeast(session: AdminSession, role: AdminRole): boolean {
  if (!session.authenticated) return false;
  return RANK[session.role] >= RANK[role];
}
