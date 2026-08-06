import Link from "next/link";
import { desc } from "drizzle-orm";

import {
  changeOwnPasswordAction,
  inviteAdminAction,
  setAdminActiveAction,
} from "@/app/admin/actions";
import { Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { getDb } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { atLeast, getAdminSession } from "@/lib/admin-auth";
import { capabilities } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Who can get in" };

/**
 * Admin accounts.
 *
 * WHY THIS SCREEN IS THE POINT OF THE WHOLE AUTH REWRITE
 *
 * The shop shipped with one shared password. That works for exactly one person
 * and fails the moment there are two: the audit log records every change as
 * "admin", so "who changed this price" has no answer, and removing one person's
 * access means changing the password and redistributing it to everybody else.
 *
 * The accounts, roles and hashing were built first. Without this screen none of
 * it was reachable, so the shared password was still the only way in and the
 * audit log was still fiction. This is what retires it.
 *
 * THE ONE-TIME PASSWORD IS SHOWN, NOT EMAILED.
 *
 * There is no guaranteed mail provider, and the realistic delivery is Alberta
 * reading it out or sending it on WhatsApp. So it appears once, on screen, in a
 * form built from characters that do not get misread out loud, and the account
 * is flagged to change it on first sign-in.
 */
export default async function AdminUsersPage() {
  const session = await getAdminSession();
  const db = getDb();
  const isOwner = atLeast(session, "owner");

  const users = db
    ? await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt))
    : [];

  const field =
    "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm";

  const activeOwners = users.filter(
    (user) => user.active && user.role === "owner",
  ).length;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/admin/settings" className="hover:text-accent-quiet">
          Settings
        </Link>
        <span aria-hidden> / </span>
        <span className="text-strong">Who can get in</span>
      </nav>

      <PageHeader
        title="Who can get in"
        description="Each person gets their own login, so every change in the audit log has a name against it."
      />

      {/*
        The shared password is a real state and worth naming out loud. Somebody
        signed in this way is anonymous in the record, and that should look like
        a thing to fix rather than a thing to leave.
      */}
      {session.shared && (
        <div className="mt-6 rounded-2xl border border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_7%,transparent)] p-5">
          <p className="text-sm font-semibold text-strong">
            You are signed in with the shared password
          </p>
          <p className="measure mt-1.5 text-sm/6 text-muted">
            Every change you make is recorded as <code>shared-password</code>{" "}
            rather than as you. Create an account below, sign out, then sign back
            in with it. Once everyone has their own login, remove{" "}
            <code>ADMIN_PASSWORD</code> from the environment and the shared way
            in is closed.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* ---- invite ---- */}
        {isOwner && (
          <Card>
            <h2 className="font-semibold text-strong">Add someone</h2>
            <p className="mt-1.5 text-xs/5 text-muted">
              You will get a one-time password to pass on. They change it when
              they first sign in.
            </p>

            <ActionForm
              action={inviteAdminAction}
              className="mt-5 grid gap-3"
              successLabel="Account created"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="alberta@efeorganics.com"
                  className={field}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  Name <span className="font-normal text-muted">(optional)</span>
                </span>
                <input name="name" className={field} />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-strong">
                  What they can do
                </span>
                <select name="role" defaultValue="staff" className={field}>
                  <option value="staff">
                    Staff: orders and stock
                  </option>
                  <option value="manager">
                    Manager: also prices and promotions
                  </option>
                  <option value="owner">
                    Owner: everything, including people
                  </option>
                </select>
              </label>

              <SubmitButton pendingLabel="Creating">
                Create account
              </SubmitButton>
            </ActionForm>

            <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-xs/5 text-muted">
              Adding an email that already exists resets that account instead of
              failing, which is what you want when somebody has lost their
              password.
            </p>
          </Card>
        )}

        {/* ---- who exists ---- */}
        <Card>
          <h2 className="font-semibold text-strong">Accounts</h2>

          {!capabilities.hasDb ? (
            <p className="mt-4 text-sm text-muted">
              Accounts need a database. Set <code>DATABASE_URL</code>.
            </p>
          ) : users.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm/6 text-muted">
              Nobody has a personal account yet. The shared password is the only
              way in, which means the audit log cannot name anybody. Create the
              first account on the left.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {users.map((user) => {
                const lastOwner =
                  user.role === "owner" && user.active && activeOwners === 1;

                return (
                  <li
                    key={user.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-strong">
                        {user.name || user.email}
                        {user.id === session.userId && (
                          <span className="font-normal text-muted"> (you)</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {user.name ? `${user.email} · ` : ""}
                        {user.lastSeenAt
                          ? `last in ${new Date(user.lastSeenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                          : "never signed in"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Pill tone={user.role === "owner" ? "info" : "neutral"}>
                        {user.role}
                      </Pill>
                      {user.mustChangePassword && (
                        <Pill tone="warn">password not set</Pill>
                      )}
                      {!user.active && <Pill tone="bad">no access</Pill>}
                    </div>

                    {isOwner && user.id !== session.userId && (
                      <ActionForm action={setAdminActiveAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(!user.active)}
                        />
                        <SubmitButton
                          variant={user.active ? "danger" : "quiet"}
                          disabled={lastOwner}
                          pendingLabel="Saving"
                        >
                          {user.active ? "Remove access" : "Restore access"}
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-4 text-xs/5 text-muted">
            Accounts are never deleted, only deactivated, because the audit log
            points at them. Deleting a person would orphan the record of what
            they changed.
          </p>
        </Card>
      </div>

      {/* ---- own password ---- */}
      <Card className="mt-5 max-w-xl">
        <h2 className="font-semibold text-strong">Change your password</h2>
        {session.userId ? (
          <ActionForm
            action={changeOwnPasswordAction}
            className="mt-5 grid gap-3"
            successLabel="Password changed"
            resetOnSuccess
          >
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Current password
              </span>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                New password
              </span>
              <input
                name="newPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                New password again
              </span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className={field}
              />
            </label>
            <p className="text-xs/5 text-muted">
              At least 12 characters. A short phrase you will remember beats
              eight characters of punctuation you will write on a note.
            </p>
            <SubmitButton pendingLabel="Changing">Change password</SubmitButton>
          </ActionForm>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm/6 text-muted">
            You are on the shared password, which has no personal account behind
            it to change. Create one above and sign in with it.
          </p>
        )}
      </Card>
    </div>
  );
}
