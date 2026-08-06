/**
 * Creates the first admin account, directly against the database.
 *
 *   npx tsx --env-file=.env.local scripts/create-admin.mjs alberta@efeorganics.com "a long passphrase" --name "Alberta" --role owner
 *
 * WHY THIS EXISTS RATHER THAN A SHARED PASSWORD IN PRODUCTION
 *
 * The admin fails closed: with no `ADMIN_PASSWORD` and no rows in `admin_users`,
 * nothing can sign in. That is the correct posture and it produces a chicken and
 * egg problem on a fresh deployment, because the screen that creates accounts is
 * itself behind the login.
 *
 * The usual workaround is to set `ADMIN_PASSWORD` in production, sign in, create
 * an account, then remove it. That works, and it means a shared unattributed
 * credential exists in the environment for as long as somebody forgets to take
 * it out. This avoids that entirely: the first real account is created here, and
 * production never has a shared password at all.
 *
 * THE PASSWORD IS AN ARGUMENT, WHICH MEANS IT IS IN YOUR SHELL HISTORY.
 * Change it from the admin once you are in, or clear the history line. It is the
 * least bad option available to a non-interactive script.
 */
import postgres from "postgres";

import { hashPassword } from "../src/lib/password.ts";

const [email, password, ...rest] = process.argv.slice(2);

function flag(name, fallback) {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : fallback;
}

const name = flag("name", null);
const role = flag("role", "owner");

if (!email || !password) {
  console.error(
    'Usage: create-admin.mjs <email> "<password>" [--name "Full Name"] [--role owner|manager|staff]',
  );
  process.exit(1);
}
if (!email.includes("@")) {
  console.error("That does not look like an email address.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use at least 12 characters. A short phrase you will remember beats eight characters of punctuation.");
  process.exit(1);
}
if (!["owner", "manager", "staff"].includes(role)) {
  console.error("Role must be owner, manager or staff.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const normalised = email.trim().toLowerCase();
const passwordHash = await hashPassword(password);

const [row] = await sql`
  insert into admin_users (email, name, role, password_hash, must_change_password, active)
  values (${normalised}, ${name}, ${role}, ${passwordHash}, false, true)
  on conflict (email) do update
    set password_hash = excluded.password_hash,
        must_change_password = false,
        active = true,
        role = excluded.role,
        name = coalesce(excluded.name, admin_users.name)
  returning id, email, role
`;

/*
  Recorded in the audit log like any other change. An account appearing with no
  trace of who created it is exactly the gap this whole system exists to close,
  and "created by a script" is a truthful actor.
*/
await sql`
  insert into audit_log (actor_email, action, entity, entity_id, changes)
  values ('create-admin-script', 'admin.invite', 'admin_user', ${row.id},
          ${sql.json({ email: normalised, role, viaScript: true })})
`;

const [{ count }] = await sql`select count(*)::int as count from admin_users where active`;

console.log(`\nAccount ready: ${row.email} (${row.role})`);
console.log(`Active admin accounts: ${count}`);
console.log(`\nSign in at /admin with that email and password.`);
console.log(`Then change the password under Settings, Who can get in.`);

await sql.end();
