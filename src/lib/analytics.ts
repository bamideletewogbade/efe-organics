"use client";

/**
 * Client-side event tracking.
 *
 * Design constraints, in the order they mattered:
 *
 * 1. **It must not cost the shopper anything.** Events are queued and flushed on
 *    a timer, with `navigator.sendBeacon` so a flush survives the page being
 *    closed. A `fetch` in an unload handler is routinely cancelled — which is
 *    exactly when the most interesting events (abandon, exit) happen.
 *
 * 2. **It must not break anything.** Every call is wrapped; storage can throw in
 *    private browsing, and a shop that fails because analytics failed is a
 *    strictly worse shop.
 *
 * 3. **It must be honest about identity.** `anonymousId` is a random id in
 *    first-party storage. Not a fingerprint, no cross-site value, and clearing
 *    site data genuinely clears it. `sessionId` rotates after 30 minutes idle,
 *    the standard definition, so "sessions" means what an analyst expects.
 */

const ANON_KEY = "efe_anon";
const SESSION_KEY = "efe_session";
const SESSION_TTL_MS = 30 * 60 * 1000;
const FLUSH_MS = 4_000;

type Queued = {
  name: string;
  path?: string;
  referrer?: string;
  props?: Record<string, unknown>;
  anonymousId: string;
  sessionId: string;
  device: string;
  utm?: { source?: string; medium?: string; campaign?: string };
};

let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private browsing — tracking degrades, the shop does not */
  }
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

function anonymousId(): string {
  let id = readStore(ANON_KEY);
  if (!id) {
    id = randomId();
    writeStore(ANON_KEY, id);
  }
  return id;
}

/** Rotates after 30 minutes of inactivity — the conventional session boundary. */
function sessionId(): string {
  const now = Date.now();
  const raw = readStore(SESSION_KEY);
  if (raw) {
    const [id, lastSeen] = raw.split(".");
    if (id && Number(lastSeen) > now - SESSION_TTL_MS) {
      writeStore(SESSION_KEY, `${id}.${now}`);
      return id;
    }
  }
  const id = randomId();
  writeStore(SESSION_KEY, `${id}.${now}`);
  return id;
}

function deviceType(): string {
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

/**
 * Campaign attribution is captured ONCE per session and replayed on every
 * event. Reading it per-event would credit only the landing page, so a purchase
 * three clicks later would look like it came from nowhere.
 */
function utm(): Queued["utm"] {
  const KEY = "efe_utm";
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    if (source) {
      const value = {
        source,
        medium: params.get("utm_medium") ?? undefined,
        campaign: params.get("utm_campaign") ?? undefined,
      };
      window.sessionStorage.setItem(KEY, JSON.stringify(value));
      return value;
    }
    const stored = window.sessionStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

function flush(useBeacon = false): void {
  if (queue.length === 0) return;
  const batch = queue.slice(0, 20);
  queue = queue.slice(20);

  const payload = JSON.stringify({ events: batch });

  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/events",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never surface */
  }
}

export function track(
  name: string,
  props?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    queue.push({
      name,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      props,
      anonymousId: anonymousId(),
      sessionId: sessionId(),
      device: deviceType(),
      utm: utm(),
    });

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => flush(false), FLUSH_MS);
  } catch {
    /* never surface */
  }
}

/** Registered once by <AnalyticsProvider>. */
export function installFlushHandlers(): () => void {
  const onHidden = () => {
    if (document.visibilityState === "hidden") flush(true);
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", () => flush(true));
  return () => document.removeEventListener("visibilitychange", onHidden);
}
