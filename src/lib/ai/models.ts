/**
 * Which models Efe uses, and in what order.
 *
 * VERIFIED AGAINST OPENROUTER'S LIVE MODEL LIST, NOT REMEMBERED.
 *
 * Every id below was read from `https://openrouter.ai/api/v1/models` rather
 * than recalled, because model ids churn constantly and a wrong one fails at
 * runtime with an unhelpful 400. Re-check them with:
 *
 *   npx tsx scripts/check-ai-models.mjs
 *
 * FALLBACKS CROSS VENDORS, DELIBERATELY.
 *
 * OpenRouter takes a `models` array and walks it on error: context-length
 * rejections, moderation blocks, rate limits and provider downtime all move to
 * the next entry, and the response reports which one actually served. That is
 * the whole retry mechanism, so we do not hand-roll one.
 *
 * But a chain of four Google models is not a fallback chain. The most likely
 * failure is not "this model refused", it is "this provider is having an
 * afternoon", and every Gemini entry goes down together. So each chain steps
 * across vendors: Google, then OpenAI, then DeepSeek or Meta. Slightly worse
 * output from a different company beats an outage.
 *
 * TWO TIERS, BECAUSE THE WORK IS NOT ALL THE SAME.
 *
 * Answering "is the lemon bath in stock" and drafting product copy from an
 * ingredient list are not the same job and should not cost the same. `fast` is
 * for high-volume, low-stakes work. `quality` is for anything a customer will
 * read as Efe's own words.
 */

/**
 * Tiers are split by MODALITY as well as by cost, and that split is load-bearing.
 *
 * THE BUG THIS FIXES
 *
 * The first version had two chains, `fast` and `quality`, each led by Gemini and
 * backed by OpenAI, Meta, Mistral and DeepSeek. Checked against OpenRouter's
 * live model list, those fallbacks are TEXT ONLY, while every Gemini in front of
 * them accepts image, video, audio and file input.
 *
 * So a request carrying a product photograph would work perfectly until the
 * moment Gemini was rate limited, and then quietly fall through to a model that
 * cannot see the picture. OpenRouter walks the chain on error, and "this model
 * has no vision" is not an error it can detect on your behalf. The failure mode
 * is not a crash, it is a confident answer about an image nobody looked at,
 * which on a cosmetics catalogue is the worst possible shape of wrong.
 *
 * Every model in `vision` accepts images. Every model in `text` and `quality` is
 * text in, text out. Nothing mixes.
 */
export type ModelTier = "fast" | "quality" | "vision" | "image" | "video";

/**
 * Cost per million tokens, for the running total on the AI screen.
 *
 * OpenRouter bills the model that actually served, so a fallback changes what a
 * call costs. Keeping the rates here lets us estimate without a second API call,
 * and they are checked by the same script that checks the ids.
 */
export type ModelRate = { inPerM: number; outPerM: number };

export const RATES: Record<string, ModelRate> = {
  "google/gemini-3.1-flash-lite": { inPerM: 0.25, outPerM: 1.5 },
  "google/gemini-2.5-flash-lite": { inPerM: 0.1, outPerM: 0.4 },
  "google/gemini-3.1-pro-preview": { inPerM: 2, outPerM: 12 },
  "google/gemini-2.5-pro": { inPerM: 1.25, outPerM: 10 },
  "openai/gpt-oss-120b": { inPerM: 0.037, outPerM: 0.17 },
  "openai/gpt-5-mini": { inPerM: 0.25, outPerM: 2 },
  "deepseek/deepseek-v4-flash": { inPerM: 0.14, outPerM: 0.28 },
  "bytedance/seedance-2": { inPerM: 1.5, outPerM: 8 },
  // Output rates checked 3 Aug 2026. Both of these were recorded from an older
  // price and had drifted by the time the checker was written, which is exactly
  // the case scripts/check-ai-models.mjs exists to catch.
  "meta-llama/llama-3.1-8b-instruct": { inPerM: 0.05, outPerM: 0.08 },
  "mistralai/mistral-nemo": { inPerM: 0.019, outPerM: 0.03 },

  /* Image output. Rates read from the live list on 4 August 2026. */
  "google/gemini-3.1-flash-lite-image": { inPerM: 0.25, outPerM: 1.5 },
  "google/gemini-2.5-flash-image": { inPerM: 0.3, outPerM: 2.5 },
  "google/gemini-3.1-flash-image": { inPerM: 0.5, outPerM: 3 },
  "openai/gpt-5-image-mini": { inPerM: 2.5, outPerM: 2 },
};

/**
 * What each tier can actually take in and give back.
 *
 * Exported so the admin can say so on screen rather than a developer knowing it.
 * "Why did it ignore my photo" should be answerable by looking.
 */
export const TIER_CAPABILITY: Record<
  ModelTier,
  { accepts: string[]; returns: string; use: string }
> = {
  fast: { accepts: ["text"], returns: "text", use: "Questions and lookups" },
  quality: { accepts: ["text"], returns: "text", use: "Writing copy" },
  vision: {
    accepts: ["text", "image"],
    returns: "text",
    use: "Reading a photograph",
  },
  image: {
    accepts: ["text", "image"],
    returns: "image",
    use: "Drafting a picture",
  },
  video: {
    accepts: ["text", "image"],
    returns: "video_prompt",
    use: "Seedance 2 Video Ad Prompts & Storyboards",
  },
};

export const CHAINS: Record<ModelTier, string[]> = {
  fast: [
    "google/gemini-3.1-flash-lite",
    "google/gemini-2.5-flash-lite",
    "openai/gpt-oss-120b",
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-nemo",
  ],

  quality: [
    "google/gemini-3.1-pro-preview",
    "google/gemini-2.5-pro",
    "openai/gpt-5-mini",
    "deepseek/deepseek-v4-flash",
  ],

  vision: [
    "google/gemini-3.1-flash-lite",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-pro",
    "openai/gpt-5-mini",
  ],

  image: [
    "google/gemini-3.1-flash-lite-image",
    "google/gemini-2.5-flash-image",
    "google/gemini-3.1-flash-image",
    "openai/gpt-5-image-mini",
  ],

  video: [
    "bytedance/seedance-2",
    "google/gemini-3.1-pro-preview",
    "openai/gpt-5-mini",
  ],
};

/** Estimated cost in US cents. Returns null for a model we have no rate for. */
export function estimateCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const rate = RATES[model];
  if (!rate) return null;
  const dollars =
    (promptTokens / 1_000_000) * rate.inPerM +
    (completionTokens / 1_000_000) * rate.outPerM;
  return Math.round(dollars * 100 * 10000) / 10000;
}
