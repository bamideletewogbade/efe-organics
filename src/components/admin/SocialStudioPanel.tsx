"use client";

import { useState, useActionState } from "react";
import type { AiDraft } from "@/app/admin/ai-actions";
import type { ActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/admin/Form";

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-strong";

export function SocialStudioPanel({
  products,
  draftAction,
  publishAction,
  hasBlotato,
}: {
  products: Array<{ id: string; name: string }>;
  draftAction: (_prev: AiDraft, formData: FormData) => Promise<AiDraft>;
  publishAction: (
    _prev: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  hasBlotato: boolean;
}) {
  const [draftState, runDraft, isDrafting] = useActionState(draftAction, {
    ok: false,
  });
  const [publishState, runPublish, isPublishing] = useActionState(
    publishAction,
    {},
  );

  const [platform, setPlatform] = useState("instagram");
  const [editableText, setEditableText] = useState("");

  const handleDraftSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await draftAction(draftState, formData);
    if (result.ok && result.text) {
      setEditableText(result.text);
    }
  };

  return (
    <div className="mt-5 space-y-6">
      {/* 1. Generator Form */}
      <form onSubmit={handleDraftSubmit} className="grid gap-4 rounded-xl border border-line bg-surface-sunken p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Target Platform</span>
            <select
              name="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={field}
            >
              <option value="instagram">Instagram (Caption & Hashtags)</option>
              <option value="tiktok">TikTok (Script & Caption)</option>
              <option value="facebook">Facebook (Post)</option>
            </select>
          </label>

          <label className="block">
            <span className={label}>Product Line</span>
            <select name="productId" className={field}>
              <option value="">General Range Campaign</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={label}>Campaign Angle</span>
          <select name="angle" className={field}>
            <option value="product_drop">Product Drop & Launch</option>
            <option value="ingredients">Ingredient Spotlight & Heritage</option>
            <option value="skincare_tips">Skincare Routine & How to Use</option>
            <option value="trade_wholesale">Wholesale & Salon Supply</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isDrafting}
          className="rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-paper transition-all hover:bg-forest/90 justify-self-start disabled:opacity-50"
        >
          {isDrafting ? "Drafting with AI..." : "Generate Social Copy"}
        </button>

        {draftState.error && (
          <p className="text-xs font-medium text-[var(--blocked)]">{draftState.error}</p>
        )}
      </form>

      {/* 2. Review, Edit & Publish */}
      {(editableText || draftState.ok) && (
        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-strong">
              Generated Copy for {platform}
            </h3>
            {draftState.model && (
              <span className="text-[0.68rem] text-muted">
                Model: {draftState.model} ({draftState.ms}ms)
              </span>
            )}
          </div>

          <form action={runPublish} className="space-y-3">
            <input type="hidden" name="platform" value={platform} />
            <label className="block">
              <span className="mb-1 block text-xs text-muted">
                Edit copy before publishing:
              </span>
              <textarea
                name="caption"
                rows={7}
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className={`${field} resize-y font-sans`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 items-end">
              <label className="block">
                <span className={label}>Schedule Time (Optional)</span>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  className={field}
                />
              </label>

              <SubmitButton pendingLabel="Publishing to Blotato...">
                {hasBlotato ? `Publish to ${platform} via Blotato` : `Simulate Publish (${platform})`}
              </SubmitButton>
            </div>

            {publishState.error && (
              <p className="text-xs font-medium text-[var(--blocked)]">
                {publishState.error}
              </p>
            )}
            {publishState.ok && (
              <p className="text-xs font-medium text-[var(--live)]">
                {publishState.message}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
