import Link from "next/link";

import { draftSocialCampaignAction, publishToBlotatoAction } from "@/app/admin/ai-actions";
import { Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import { SocialStudioPanel } from "@/components/admin/SocialStudioPanel";
import { getDb } from "@/db/client";
import { products } from "@/db/schema";
import { capabilities } from "@/lib/env";

import { CampaignCarousel } from "@/components/admin/CampaignCarousel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing Studio" };

export default async function AdminMarketingPage() {
  const db = getDb();
  const productList = db
    ? await db.select({ id: products.id, name: products.name }).from(products)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Marketing Studio & Social Publisher"
        description="Craft Seedance 2 video prompts, generate grounded social media copy, and publish directly to Instagram, TikTok, and Facebook via Blotato."
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone={capabilities.hasAI ? "good" : "warn"}>
              {capabilities.hasAI ? "AI & Seedance 2 Ready" : "No OpenRouter key"}
            </Pill>
            <Pill tone={capabilities.hasBlotato ? "good" : "info"}>
              {capabilities.hasBlotato ? "Blotato Connected" : "Blotato Demo"}
            </Pill>
          </div>
        }
      />

      {/* Interactive 3D Showcase Carousel */}
      <CampaignCarousel />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="font-semibold text-strong">Generate & Publish Social Posts</h2>
          <p className="mt-1.5 text-sm/6 text-muted">
            Select a product and social network. AI generates copy grounded in ingredient facts and brand voice, ready for one-click publishing into Blotato.
          </p>

          <SocialStudioPanel
            products={productList}
            draftAction={draftSocialCampaignAction}
            publishAction={publishToBlotatoAction}
            hasBlotato={capabilities.hasBlotato}
          />
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-strong">Blotato Social Gateway</h2>
            <p className="mt-2 text-xs/5 text-muted">
              Blotato (`api.blotato.com`) is Efe&apos;s social scheduling gateway. It distributes posts to Instagram, TikTok, and Facebook without needing individual app API approvals for each network.
            </p>

            <ul className="mt-4 space-y-2 text-xs text-muted">
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> Auto-formats captions per platform
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> Grounded in ingredient facts & heritage
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> One-click direct scheduling
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
