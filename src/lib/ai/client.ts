import { brand } from "@/lib/brand";
import { capabilities, env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { CHAINS, estimateCents, type ModelTier } from "@/lib/ai/models";

/**
 * The one place anything talks to a model.
 *
 * WHY A SINGLE CHOKE POINT
 *
 * Every AI feature in the plan (product copy, a WhatsApp agent, "ask the shop")
 * needs the same four things: a fallback chain, a timeout, a cost record and a
 * refusal to invent claims about a cosmetic. Writing that four times means
 * getting it right once and wrong three times. So features describe what they
 * want and this decides how it happens.
 *
 * THE HOUSE RULES, ENFORCED HERE RATHER THAN HOPED FOR
 *
 * 1. **Grounded or nothing.** Callers pass facts. The system prompt says, in
 *    every request, that anything not in those facts is not known. A model
 *    guessing at what black soap cures is not a quality problem, it is a
 *    regulatory one, and Efe's certification position is still an open question.
 *
 * 2. **Never publishes.** This returns text. Nothing here sends, posts or saves
 *    anything a customer sees. A human approves, always.
 *
 * 3. **Fails soft.** No key, provider down, timeout: the caller gets a null and
 *    the shop carries on. AI is an assistant to this business, never a
 *    dependency of it.
 *
 * 4. **Costs are recorded.** Every call logs its model, tokens and estimated
 *    cost. "The AI bill went up" should be answerable.
 */

const log = logger.child({ module: "ai" });

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 45_000;

/**
 * The claims rule, prepended to every system prompt.
 *
 * Deliberately blunt and deliberately not overridable by a caller. The failure
 * this prevents is a plausible sentence like "clinically proven to clear acne"
 * appearing on a product page for a real business, which is a claim nobody has
 * evidence for and which arrives sounding exactly like marketing copy.
 */
const GUARDRAILS = `You write for ${brand.name}, a Ghanaian maker of organic African Black Soap, herbal hair care and natural body care.

Absolute rules:
- Use ONLY the facts provided below. If something is not in them, say you do not know. Never fill a gap with a plausible guess.
- Never claim a product treats, cures, heals or prevents any condition. Never claim a clinical or dermatological result. Never imply a before-and-after.
- Never invent an ingredient, a certification, a price, a stock level or a delivery time.
- Never invent a customer review or testimonial.
- Write plainly, in British English. No marketing filler, no em dashes, no words like "elevate", "unlock", "journey" or "nourishing ritual".
- Prices are in Ghana cedis (GH₵).`;

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiRequest = {
  /** What the model is being asked to do. */
  instruction: string;
  /** Everything it is allowed to treat as true. */
  facts?: string;
  /** Prior turns, for a conversation. */
  history?: AiMessage[];
  tier?: ModelTier;
  maxTokens?: number;
  temperature?: number;
  /** Names the call site in logs and cost reporting, e.g. "product-copy". */
  purpose: string;
};

export type AiResult = {
  text: string;
  /** Which model actually served, which may not be the first in the chain. */
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCents: number | null;
  ms: number;
  /** True when the primary was skipped and something further down answered. */
  usedFallback: boolean;
};

export type AiFailure = {
  reason: "not_configured" | "timeout" | "provider_error" | "empty";
  detail?: string;
};

/**
 * Runs one request.
 *
 * Returns a discriminated result rather than throwing. Every caller here is a
 * page or an action that must still render when the model is unavailable, and
 * a try/catch at each of those call sites is how the "fails soft" rule quietly
 * stops being true.
 */
export async function ask(
  request: AiRequest,
): Promise<{ ok: true; result: AiResult } | { ok: false; error: AiFailure }> {
  if (!capabilities.hasAI) {
    return { ok: false, error: { reason: "not_configured" } };
  }

  const chain = CHAINS[request.tier ?? "fast"];
  const started = Date.now();

  const system = request.facts
    ? `${GUARDRAILS}\n\nFACTS YOU MAY USE:\n${request.facts}`
    : `${GUARDRAILS}\n\nNo facts were supplied. Say you do not have the information rather than guessing.`;

  const messages: AiMessage[] = [
    { role: "system", content: system },
    ...(request.history ?? []),
    { role: "user", content: request.instruction },
  ];

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.server.openRouterApiKey}`,
        "Content-Type": "application/json",
        // OpenRouter attributes usage to these, which is how the spend shows up
        // per-application rather than as one undifferentiated bill.
        "HTTP-Referer": env.public.siteUrl,
        "X-Title": `${brand.name} admin`,
      },
      body: JSON.stringify({
        // The whole chain, in priority order. OpenRouter walks it on error.
        models: chain,
        messages,
        max_tokens: request.maxTokens ?? 900,
        temperature: request.temperature ?? 0.4,
        usage: { include: true },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      log.warn("ai request rejected", {
        purpose: request.purpose,
        status: response.status,
        detail,
      });
      return { ok: false, error: { reason: "provider_error", detail } };
    }

    const body = await response.json();
    const text: string = body?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false, error: { reason: "empty" } };
    }

    const model: string = body?.model ?? chain[0];
    const promptTokens = Number(body?.usage?.prompt_tokens ?? 0);
    const completionTokens = Number(body?.usage?.completion_tokens ?? 0);

    const result: AiResult = {
      text,
      model,
      promptTokens,
      completionTokens,
      estimatedCents: estimateCents(model, promptTokens, completionTokens),
      ms: Date.now() - started,
      usedFallback: model !== chain[0],
    };

    log.info("ai call", {
      purpose: request.purpose,
      model,
      usedFallback: result.usedFallback,
      promptTokens,
      completionTokens,
      cents: result.estimatedCents,
      ms: result.ms,
    });

    // A fallback firing is worth surfacing: it usually means the primary is
    // rate-limited or down, and noticing that from a log is better than
    // noticing it from a bill.
    if (result.usedFallback) {
      log.warn("ai used a fallback model", {
        purpose: request.purpose,
        wanted: chain[0],
        got: model,
      });
    }

    return { ok: true, result };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    log.warn("ai call failed", {
      purpose: request.purpose,
      error: String(error),
    });
    return {
      ok: false,
      error: {
        reason: timedOut ? "timeout" : "provider_error",
        detail: String(error),
      },
    };
  }
}

/** Human-readable reason, for showing in the admin. */
export function explainFailure(error: AiFailure): string {
  switch (error.reason) {
    case "not_configured":
      return "No OPENROUTER_API_KEY is set, so the assistant is switched off.";
    case "timeout":
      return "The model took too long. Try again.";
    case "empty":
      return "The model returned nothing usable.";
    default:
      return "The model provider returned an error. Try again shortly.";
  }
}
