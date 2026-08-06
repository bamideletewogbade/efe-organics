"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { orderItems, orders, products } from "@/db/schema";
import { ask, explainFailure } from "@/lib/ai/client";
import {
  catalogueFacts,
  ordersFacts,
  productFacts,
  stockFacts,
  stockistFacts,
  voiceFacts,
} from "@/lib/ai/grounding";
import { getAdminSession } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

/**
 * The AI actions the admin can run.
 *
 * NOTHING HERE SAVES ANYTHING.
 *
 * Every action returns text for a person to read, edit and then save through the
 * ordinary product form. That is the single most important property of this
 * file. The moment a model can write to the catalogue, "the description is
 * wrong" becomes a question nobody can answer, and for a cosmetics business a
 * wrong description is not a typo, it is a claim.
 *
 * The one exception is reading: the actions below query the catalogue to build
 * facts, which is what stops the model inventing them.
 *
 * COST AND MODEL ARE RETURNED, NOT HIDDEN.
 *
 * Every result says which model served and roughly what it cost. A fallback
 * firing usually means the primary is rate limited, and finding that out from
 * the screen beats finding it out from a bill.
 */

const log = logger.child({ module: "ai-actions" });

async function assertAdmin() {
  const session = await getAdminSession();
  if (!session.authenticated) throw new Error("Not authorised");
  return session;
}

export type AiDraft = {
  ok: boolean;
  text?: string;
  error?: string;
  model?: string;
  usedFallback?: boolean;
  cents?: number | null;
  ms?: number;
};

/**
 * Per-person budget guard.
 *
 * A model call costs real money and a button can be clicked repeatedly. Twenty
 * an hour is far more drafting than anyone does in a sitting and cheap enough
 * that a stuck finger cannot run up a bill.
 */
function withinBudget(actor: string): boolean {
  return rateLimit(`ai:${actor}`, 20, 60 * 60 * 1000).ok;
}

/* -------------------------------------------------------------------------- */
/* Product copy                                                               */
/* -------------------------------------------------------------------------- */

export async function draftProductCopyAction(
  _prev: AiDraft,
  formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "That is a lot of drafts in one hour. Try again shortly." };
  }

  const productId = String(formData.get("productId") ?? "");
  const kind = String(formData.get("kind") ?? "description") as
    | "description"
    | "blurb"
    | "howToUse";

  const db = getDb();
  if (!db || !productId) {
    return { ok: false, error: "Could not find that product." };
  }

  const [product] = await db
    .select({ slug: products.slug, name: products.name })
    .from(products)
    .where(eq(products.id, productId));
  if (!product) return { ok: false, error: "Could not find that product." };

  const facts = await productFacts(product.slug);
  if (!facts) {
    return {
      ok: false,
      error:
        "This product is not in the catalogue the assistant can read, so there is nothing to ground a description in.",
    };
  }

  const voice = await voiceFacts();

  /*
    THE INSTRUCTION IS SPECIFIC ABOUT LENGTH AND SHAPE.

    "Write a product description" produces four paragraphs of atmosphere. The
    useful output here is short, concrete and built from the ingredient list,
    because that is the one thing this shop has that its competitors' pages do
    not.
  */
  const instructions: Record<typeof kind, string> = {
    blurb: `Write ONE sentence for ${product.name}, under 18 words, for the shop card. Say what it is and who it suits. No adjectives that could apply to any product.`,
    description: `Write a product description for ${product.name}. Two short paragraphs, under 90 words in total. First paragraph: what it is and what is in it, drawn from the ingredient list. Second: how it feels to use and who it suits. Do not repeat the product name more than twice. Do not claim any result.`,
    howToUse: `Write directions for using ${product.name}. Three or four short numbered steps. Base them on the existing directions if there are any. Be practical and specific.`,
  };

  const response = await ask({
    purpose: `product-copy:${kind}`,
    tier: "quality",
    instruction: instructions[kind],
    facts: `${facts}\n\n${voice}`,
    maxTokens: 500,
    temperature: 0.5,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("copy drafted", {
    productId,
    kind,
    model: response.result.model,
    by: session.actorEmail,
  });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}

/* -------------------------------------------------------------------------- */
/* Ask the shop                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Answers a plain-English question about the catalogue and stock.
 *
 * Uses the `fast` tier: these are lookups over facts already assembled, not
 * writing, and the million-token context means the whole catalogue goes in the
 * prompt rather than needing retrieval.
 */
export async function askShopAction(
  _prev: AiDraft,
  formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "Too many questions in one hour. Try again shortly." };
  }

  const question = String(formData.get("question") ?? "").trim().slice(0, 500);
  if (!question) return { ok: false, error: "Ask something first." };

  const [catalogue, stock, orderInfo, stockistInfo] = await Promise.all([
    catalogueFacts(),
    stockFacts(),
    ordersFacts(),
    stockistFacts(),
  ]);

  const response = await ask({
    purpose: "ask-shop",
    tier: "fast",
    instruction: `${question}\n\nAnswer concisely. If referencing orders, stock, or products, provide clear specifics. If the facts do not contain the answer, say exactly what is missing rather than guessing.`,
    facts: `${catalogue}\n\n${stock}\n\n${orderInfo}\n\n${stockistInfo}`,
    maxTokens: 500,
    temperature: 0.2,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("shop question answered", {
    model: response.result.model,
    by: session.actorEmail,
  });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}

/* -------------------------------------------------------------------------- */
/* Social Campaign Drafting & Blotato Publishing                              */
/* -------------------------------------------------------------------------- */

export async function draftSocialCampaignAction(
  _prev: AiDraft,
  formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "Too many AI drafts in one hour. Try again shortly." };
  }

  const productId = String(formData.get("productId") ?? "");
  const platform = String(formData.get("platform") ?? "instagram");
  const angle = String(formData.get("angle") ?? "product_drop");

  const db = getDb();
  let facts = await catalogueFacts();
  let productName = "our African Black Soap range";

  if (db && productId) {
    const [product] = await db
      .select({ slug: products.slug, name: products.name })
      .from(products)
      .where(eq(products.id, productId));

    if (product) {
      productName = product.name;
      const pFacts = await productFacts(product.slug);
      if (pFacts) facts = pFacts;
    }
  }

  const voice = await voiceFacts();

  const platformInstructions: Record<string, string> = {
    instagram: `Write an Instagram post for ${productName}. 1. Strong hook line. 2. Engaging body paragraph focused on organic ingredients, handcrafted Ghanaian heritage, and skin benefits. 3. Call-to-action link in bio. 4. 4-6 curated hashtags. 5. Brief visual concept suggestion.`,
    tiktok: `Write a short TikTok video script & caption for ${productName}. 1. Hook text on screen (0-3s). 2. Voiceover narration script. 3. 3 viral hashtags.`,
    facebook: `Write a Facebook post for ${productName}. Conversational tone, highlighting customer benefits, ingredients, and shop order link.`,
  };

  const instruction =
    platformInstructions[platform] || platformInstructions.instagram;

  const response = await ask({
    purpose: `social-copy:${platform}`,
    tier: "quality",
    instruction: `${instruction}\nAngle: ${angle}. Keep copy concise, warm and authentic. Do not make medical cure claims.`,
    facts: `${facts}\n\n${voice}`,
    maxTokens: 600,
    temperature: 0.7,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("social copy drafted", {
    productId,
    platform,
    model: response.result.model,
    by: session.actorEmail,
  });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}

export async function generateVideoAdPromptAction(
  _prev: AiDraft,
  formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "Too many AI requests in one hour. Try again shortly." };
  }

  const productId = String(formData.get("productId") ?? "");
  const style = String(formData.get("style") ?? "cinematic");

  const db = getDb();
  let facts = await catalogueFacts();
  let productName = "our African Black Soap range";

  if (db && productId) {
    const [product] = await db
      .select({ slug: products.slug, name: products.name })
      .from(products)
      .where(eq(products.id, productId));

    if (product) {
      productName = product.name;
      const pFacts = await productFacts(product.slug);
      if (pFacts) facts = pFacts;
    }
  }

  const voice = await voiceFacts();

  const response = await ask({
    purpose: "video-prompt:seedance-2",
    tier: "video",
    instruction: `Generate a detailed Seedance 2 (bytedance/seedance-2) Video Model Prompt & Storyboard Script for a ${style} video ad featuring ${productName}.
1. Model Prompt Line (bytedance/seedance-2 format: camera movement, lighting, subject action, environment).
2. 15-second Video Scene Storyboard (3 scenes with visual descriptions).
3. Voiceover Narration Script (warm, authentic Ghanaian storytelling tone).
4. Audio & Sound FX cues.`,
    facts: `${facts}\n\n${voice}`,
    maxTokens: 700,
    temperature: 0.7,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("Seedance 2 video prompt generated", {
    productId,
    model: response.result.model,
    by: session.actorEmail,
  });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}

export async function publishToBlotatoAction(
  _prev: { ok?: boolean; message?: string; error?: string },
  formData: FormData,
) {
  const session = await assertAdmin();
  const platform = String(formData.get("platform") ?? "instagram") as
    | "instagram"
    | "tiktok"
    | "facebook";
  const caption = String(formData.get("caption") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();

  if (!caption) {
    return { error: "Caption text is required to publish." };
  }

  const { publishToBlotato } = await import("@/lib/blotato");
  const result = await publishToBlotato({
    platform,
    caption,
    scheduledAt: scheduledAt || undefined,
  });

  if (!result.ok) {
    return { error: result.error || "Failed to publish post via Blotato." };
  }

  log.info("social post submitted via action", {
    platform,
    by: session.actorEmail,
  });

  return {
    ok: true,
    message: result.message || `Published post to ${platform}!`,
  };
}

/* -------------------------------------------------------------------------- */
/* AI Order & Customer Analyst                                                */
/* -------------------------------------------------------------------------- */

export async function analyzeOrderCustomerAction(
  _prev: AiDraft,
  formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "Too many AI requests in one hour. Try again shortly." };
  }

  const orderId = String(formData.get("orderId") ?? "");
  const db = getDb();
  if (!db || !orderId) {
    return { ok: false, error: "Order not found." };
  }

  const [orderRow] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (!orderRow) return { ok: false, error: "Order details missing." };

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const itemsText = items
    .map((i) => `${i.quantity}x ${i.nameSnapshot} (${i.sizeSnapshot || "Standard"})`)
    .join(", ");

  const facts = `Customer: ${orderRow.deliveryName || "Customer"}
Town: ${orderRow.deliveryTown || "Accra"}, ${orderRow.deliveryRegion || "Ghana"}
Items Purchased: ${itemsText}
Payment Status: ${orderRow.paymentStatus}
Customer Note: ${orderRow.customerNote || "None"}`;

  const response = await ask({
    purpose: "order-analyst",
    tier: "quality",
    instruction: `Analyze this order for ${orderRow.deliveryName}:
1. Customer Purchasing Profile & Skincare Needs
2. Predicted Product Replenishment Schedule (e.g. 4-6 weeks for soaps/shampoos)
3. 2 Recommended Cross-Sell Products from the Efe Organics range
4. A warm, personalized WhatsApp follow-up message template.`,
    facts,
    maxTokens: 600,
    temperature: 0.6,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("order insight generated", { orderId, by: session.actorEmail });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}

/* -------------------------------------------------------------------------- */
/* AI FDA Ghana Cosmetic Claim Compliance Scanner                            */
/* -------------------------------------------------------------------------- */

export async function auditCosmeticClaimsAction(
  _prev: AiDraft,
  formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "Too many AI requests in one hour. Try again shortly." };
  }

  const productId = String(formData.get("productId") ?? "");
  const db = getDb();
  if (!db || !productId) return { ok: false, error: "Product not found." };

  const [prod] = await db.select().from(products).where(eq(products.id, productId));
  if (!prod) return { ok: false, error: "Product details missing." };

  const facts = `Product Name: ${prod.name}
Blurb: ${prod.blurb || "N/A"}
Ingredients: ${prod.ingredients || "N/A"}
How To Use: ${prod.howToUse || "N/A"}`;

  const response = await ask({
    purpose: "fda-compliance-audit",
    tier: "quality",
    instruction: `Audit this product copy against Ghana Food & Drugs Authority (FDA) Cosmetic Labeling Guidelines:
1. Identify any prohibited medical cure or disease treatment claims (e.g. "cures eczema", "heals acne permanently", "treats psoriasis").
2. Risk Rating: High, Medium, or Low Compliance Risk.
3. Compliant Alternative Phrasing (e.g. replace "cures eczema" with "soothes eczema-prone skin").
4. Bulleted summary of compliance recommendations.`,
    facts,
    maxTokens: 600,
    temperature: 0.2,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("FDA cosmetic audit completed", { productId, by: session.actorEmail });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}

/* -------------------------------------------------------------------------- */
/* AI Inventory Restock & Cooking Forecaster                                  */
/* -------------------------------------------------------------------------- */

export async function forecastStockRestockAction(
  _prev: AiDraft,
  _formData: FormData,
): Promise<AiDraft> {
  const session = await assertAdmin();
  if (!withinBudget(session.actorEmail)) {
    return { ok: false, error: "Too many AI requests in one hour. Try again shortly." };
  }

  const [catalogue, stock] = await Promise.all([catalogueFacts(), stockFacts()]);

  const response = await ask({
    purpose: "stock-forecast",
    tier: "quality",
    instruction: `Analyze inventory levels and recommend raw soap cooking batch production:
1. Low Stock & Out-of-Stock SKUs summary
2. Raw Material Requirements (palm kernel oil, cocoa pod ash, shea butter, cocoa butter)
3. 14-Day Batch Cooking Schedule recommendation for the workshop team.`,
    facts: `${catalogue}\n\n${stock}`,
    maxTokens: 600,
    temperature: 0.5,
  });

  if (!response.ok) {
    return { ok: false, error: explainFailure(response.error) };
  }

  log.info("stock forecast generated", { by: session.actorEmail });

  return {
    ok: true,
    text: response.result.text,
    model: response.result.model,
    usedFallback: response.result.usedFallback,
    cents: response.result.estimatedCents,
    ms: response.result.ms,
  };
}


