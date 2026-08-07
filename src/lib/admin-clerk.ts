import "server-only";

import { and, eq, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { logger } from "@/lib/logger";

/**
 * Clerk identity, mapped onto Efe's own authorisation.
 *
 * THE SPLIT, AND WHY IT IS NOT NEGOTIABLE
 *
 * Clerk answers "who is this person". It does NOT answer "may this person
 * change a price". Those are different questions and conflating them is the one
 * way this migration could go badly wrong:
 *
 *   ANYONE CAN CREATE A CLERK ACCOUNT.
 *
 * Sign-up is open by default, and even with it closed a Clerk session only
 * proves the person authenticated with Clerk. If `isAuthenticated` were treated
 * as "is an admin", the first stranger to find /admin and register would be
 * inside a live shop with customer data in it.
 *
 * So `admin_users` is an ALLOWLIST. A Clerk session grants nothing on its own.
 * The session is looked up against that table, and no row means no access, no
 * matter how valid the token is.
 *
 * WHY ROLES STAY IN POSTGRES RATHER THAN MOVING TO CLERK
 *
 * Clerk can carry roles, but only through Organizations, which is a B2B feature
 * carrying invitations, memberships and an org switcher. For three staff at one
 * company that is a large amount of machinery for a single string.
 *
 * More importantly, `audit_log.actor_id` is a foreign key onto `admin_users`.
 * Moving roles out would either break that reference or leave the audit trail
 * pointing at a table nobody maintains. The audit log is the reason the account
 * system exists at all, so it wins.
 *
 * MATCHING IS BY SUBJECT FIRST, THEN EMAIL
 *
 * `authSubject` holds the Clerk user id and is the durable identifier: it
 * survives someone changing their email address. But an account invited through
 * the admin has no subject yet, because that person has never signed in. So the
 * first successful sign-in matches on email and CLAIMS the row by writing the
 * subject into it. Every later sign-in matches on the subject directly.
 */

const log = logger.child({ module: "admin-clerk" });

export type ClerkIdentity = {
  /** Clerk user id, e.g. `user_2abc...`. */
  subject: string;
  email: string;
  name: string | null;
};

export type LinkedAdmin = {
  id: string;
  email: string;
  role: "owner" | "manager" | "staff";
  mustChangePassword: boolean;
};

/**
 * Finds the `admin_users` row for a Clerk identity, or null when there is none.
 *
 * Null is the important return value. It means "authenticated with Clerk, not
 * authorised here", which is the normal case for any member of the public who
 * happens to have signed up.
 */
export async function linkClerkIdentity(
  identity: ClerkIdentity,
): Promise<LinkedAdmin | null> {
  const db = getDb();
  if (!db) {
    // No database means no allowlist to check against. Denying is the only safe
    // answer: the alternative is that a database outage opens the admin.
    log.error("no database, cannot authorise a Clerk session");
    return null;
  }

  const email = identity.email.trim().toLowerCase();

  try {
    const [row] = await db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.active, true),
          or(
            eq(adminUsers.authSubject, identity.subject),
            eq(adminUsers.email, email),
          ),
        ),
      )
      .limit(1);

    if (!row) {
      // Worth a log line at warn: somebody with a valid Clerk account reached
      // the admin door. Usually harmless, occasionally the first sign of
      // something worth looking at.
      log.warn("clerk session with no admin account", { email });
      return null;
    }

    /*
      Claim the row on first sign-in.

      Also re-claims when the subject differs, which happens if an account is
      deleted in Clerk and recreated with the same address. The email is the
      thing Efe controls and the thing on the invitation, so it is the anchor.
    */
    if (row.authSubject !== identity.subject) {
      await db
        .update(adminUsers)
        .set({
          authSubject: identity.subject,
          name: row.name ?? identity.name,
          lastSeenAt: new Date(),
        })
        .where(eq(adminUsers.id, row.id));
      log.info("linked clerk identity to admin account", { email });
    } else {
      await db
        .update(adminUsers)
        .set({ lastSeenAt: new Date() })
        .where(eq(adminUsers.id, row.id));
    }

    return {
      id: row.id,
      email: row.email,
      role: row.role as LinkedAdmin["role"],
      mustChangePassword: row.mustChangePassword,
    };
  } catch (error) {
    log.error("failed to authorise clerk session", { error: String(error) });
    return null;
  }
}
