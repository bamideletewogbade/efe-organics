import { logger } from "@/lib/logger";

/**
 * Rate limiting for public endpoints.
 *
 * WHAT THIS PROTECTS
 *
 * `/api/orders` and `/api/events` are unauthenticated by necessity: a shopper
 * has no account. Without a limit, one script can fill the orders table with
 * junk that a real person then has to read through, or push the events table to
 * the size where the dashboard queries time out. Neither needs skill and both
 * are tedious to clean up afterwards.
 *
 * BE HONEST ABOUT WHAT THIS IS
 *
 * A fixed-window counter in process memory. That means:
 *
 * - It resets on deploy and on cold start.
 * - Each serverless instance counts separately, so the real ceiling is the
 *   limit multiplied by however many instances are warm.
 * - It is not a defence against a distributed flood.
 *
 * It is still worth having. It stops the actual likely event, which is one
 * bored person with curl or a broken client retrying in a loop, and it costs
 * nothing. When traffic justifies it, swap the map for Upstash or Vercel KV and
 * the call sites do not change. Writing this down matters more than the code:
 * an in-memory limiter that everyone believes is cluster-wide is worse than no
 * limiter, because it gets trusted.
 */

const log = logger.child({ module: "rate-limit" });

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

/** Stops the map growing without bound on a long-lived server. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. For the `Retry-After` header. */
  retryAfter: number;
};

/**
 * Counts a hit against a key.
 *
 * @param key    Caller-scoped identity, usually `route:ip`.
 * @param limit  Requests allowed per window.
 * @param windowMs Window length.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    // Logged once per window rather than per request, so a flood cannot also
    // flood the logs.
    if (existing.count === limit + 1) {
      log.warn("rate limit exceeded", { key, limit, windowMs });
    }
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: limit - existing.count, retryAfter };
}

/**
 * Best-effort client address.
 *
 * Behind Vercel the leftmost `x-forwarded-for` entry is the real client. This is
 * spoofable in general, which is another reason the limit above is a speed bump
 * and not a security control.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
