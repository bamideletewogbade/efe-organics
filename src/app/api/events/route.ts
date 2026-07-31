import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { logger } from "@/lib/logger";

/**
 * First-party event ingest.
 *
 * WHY OUR OWN AND NOT GA
 * Efe owns the data, it survives ad blockers (same-origin, no third-party
 * script), it needs no cookie banner beyond what a first-party id already
 * requires, and it can join directly to orders — which is the whole point.
 * A vendor cannot tell you that the customers who read the ingredients tab
 * convert twice as often; a table in your own database can.
 *
 * TRUST NOTHING FROM THE CLIENT
 * This endpoint is public and therefore hostile input. Everything is validated:
 * the event name must be one we recognise, strings are length-capped, `props`
 * is size-capped, and batches are count-capped. Without those, one script kiddie
 * with `curl` fills the table and the analytics become worthless.
 *
 * PRIVACY BY CONSTRUCTION
 * No IP is stored. No user agent string is stored. Country and a coarse device
 * class come from edge headers and stop there. The identifier is a first-party
 * random id the client generates — not a fingerprint, and nothing that can
 * re-identify someone across sites.
 *
 * Failures are swallowed with a 204. Analytics must never break a checkout.
 */

const log = logger.child({ route: "api/events" });

/** Allowlist. An unknown name is dropped, not stored. */
const KNOWN_EVENTS = new Set([
  "page_view",
  "product_view",
  "collection_view",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "order_placed",
  "enquiry_started",
  "enquiry_submitted",
  "stockist_click",
]);

const MAX_BATCH = 20;
const MAX_PROPS_BYTES = 2_000;

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function safeProps(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const serialised = JSON.stringify(input);
  if (serialised.length > MAX_PROPS_BYTES) return {};
  return input as Record<string, unknown>;
}

export async function POST(request: Request) {
  const db = getDb();
  // No database configured — accept and discard, so the storefront behaves
  // identically whether or not analytics is switched on.
  if (!db) return new NextResponse(null, { status: 204 });

  try {
    const body = await request.json();
    const incoming = Array.isArray(body?.events) ? body.events : [body];
    if (incoming.length === 0 || incoming.length > MAX_BATCH) {
      return new NextResponse(null, { status: 204 });
    }

    const country = request.headers.get("x-vercel-ip-country");
    const rows = [];

    for (const item of incoming) {
      const name = clip(item?.name, 64);
      const anonymousId = clip(item?.anonymousId, 64);
      const sessionId = clip(item?.sessionId, 64);
      if (!name || !anonymousId || !sessionId) continue;
      if (!KNOWN_EVENTS.has(name)) continue;

      rows.push({
        name,
        anonymousId,
        sessionId,
        path: clip(item?.path, 512),
        referrer: clip(item?.referrer, 512),
        utmSource: clip(item?.utm?.source, 120),
        utmMedium: clip(item?.utm?.medium, 120),
        utmCampaign: clip(item?.utm?.campaign, 160),
        props: safeProps(item?.props),
        country: country ? country.slice(0, 2) : null,
        deviceType: clip(item?.device, 16),
      });
    }

    if (rows.length > 0) await db.insert(events).values(rows);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // A broken analytics call must never surface to a shopper.
    log.warn("event ingest failed", { error });
    return new NextResponse(null, { status: 204 });
  }
}
