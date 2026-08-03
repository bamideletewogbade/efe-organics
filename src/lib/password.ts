import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for admin accounts.
 *
 * SCRYPT, FROM THE STANDARD LIBRARY
 *
 * bcrypt and argon2 are both fine and both are native modules. Taking a compiled
 * dependency, with the build and deployment problems that brings, for one
 * function in a shop this size is not a good trade. scrypt ships with Node, is
 * memory-hard, and is the recommended choice in OWASP's own guidance when argon2
 * is unavailable. The parameters below follow it.
 *
 * THE FORMAT ENCODES ITS OWN PARAMETERS
 *
 * `scrypt$N$r$p$salt$hash`. Cost factors change as hardware does, and a hash
 * that does not record the cost it was made with can never be upgraded, because
 * you cannot verify old passwords once you raise the numbers. Storing them means
 * an old hash still verifies and can be rewritten at the new cost on next login.
 *
 * NOTHING HERE RUNS AT THE EDGE. scrypt is Node-only, which is fine: password
 * checks happen in server actions. The middleware only ever verifies an HMAC on
 * an already-issued cookie, which is Web Crypto and edge-safe.
 */

/**
 * `promisify` picks the first overload, which is the one without options, so the
 * cost parameters would be silently dropped and every hash would be computed at
 * Node's weak defaults. Typing the promisified form explicitly is what keeps the
 * work factor real.
 */
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * OWASP's minimum for scrypt: N=2^17, r=8, p=1.
 *
 * N is the work factor and dominates both cost and memory. 2^17 with r=8 is
 * about 128MB per hash, which is the point: it is what makes a leaked database
 * expensive to attack on a GPU. It also means these calls take a noticeable
 * fraction of a second, which is correct for a login and would be wrong
 * anywhere else.
 */
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    // Node caps scrypt memory at 32MB by default and throws above it.
    maxmem: 256 * 1024 * 1024,
  })) as Buffer;

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash. A corrupt row should
 * deny access, not crash the sign-in page for everybody.
 */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const cost = { N: Number(n), r: Number(r), p: Number(p) };
  if (!Number.isFinite(cost.N) || !Number.isFinite(cost.r) || !Number.isFinite(cost.p)) {
    return false;
  }

  try {
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const derived = (await scryptAsync(
      password.normalize("NFKC"),
      salt,
      expected.length,
      { ...cost, maxmem: 256 * 1024 * 1024 },
    )) as Buffer;

    // Length check first: timingSafeEqual throws on a mismatch.
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** True when a hash was made with weaker parameters than we now use. */
export function needsRehash(stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return Number(parts[1]) < N;
}

/**
 * A readable one-time password for inviting somebody.
 *
 * Avoids characters that get misread when a password is dictated over the phone
 * or written on paper, which is exactly how this will be delivered: no O/0, no
 * I/l/1. Four groups of four is long enough to be safe for the hours it exists
 * and short enough that somebody will actually type it.
 */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return [
    chars.slice(0, 4).join(""),
    chars.slice(4, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
  ].join("-");
}
