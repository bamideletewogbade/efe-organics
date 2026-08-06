import { env, capabilities } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "blotato" });

const BLOTATO_API_BASE = "https://api.blotato.com/v1";

export type SocialPlatform = "instagram" | "tiktok" | "facebook" | "x" | "youtube";

export type BlotatoPostPayload = {
  platform: SocialPlatform;
  caption: string;
  mediaUrls?: string[];
  scheduledAt?: string; // ISO date string
};

export type BlotatoResponse = {
  ok: boolean;
  postId?: string;
  message?: string;
  error?: string;
};

export async function publishToBlotato(
  payload: BlotatoPostPayload,
): Promise<BlotatoResponse> {
  if (!capabilities.hasBlotato) {
    log.warn("BLOTATO_API_KEY is not configured. Social post creation simulated:", {
      platform: payload.platform,
      caption: payload.caption.slice(0, 80),
    });
    return {
      ok: true,
      postId: `simulated-${Date.now()}`,
      message: `Simulated: Post queued for ${payload.platform}. (BLOTATO_API_KEY missing)`,
    };
  }

  const apiKey = env.server.blotatoApiKey!;

  try {
    const res = await fetch(`${BLOTATO_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: payload.platform,
        content: payload.caption,
        media: payload.mediaUrls || [],
        scheduled_at: payload.scheduledAt || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      log.error("Blotato API call failed", { error: data });
      return { ok: false, error: data.message || "Failed to publish post via Blotato API." };
    }

    log.info("Social post successfully submitted to Blotato", {
      platform: payload.platform,
      postId: data.id,
    });

    return {
      ok: true,
      postId: data.id || `blotato-${Date.now()}`,
      message: payload.scheduledAt
        ? `Scheduled for ${payload.platform} via Blotato`
        : `Published to ${payload.platform} via Blotato`,
    };
  } catch (error) {
    log.error("Error communicating with Blotato REST API", { error });
    return { ok: false, error: "Network error connecting to Blotato API." };
  }
}
