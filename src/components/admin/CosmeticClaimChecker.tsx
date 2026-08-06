"use client";

import { useActionState } from "react";
import type { AiDraft } from "@/app/admin/ai-actions";

export function CosmeticClaimChecker({
  productId,
  action,
}: {
  productId: string;
  action: (_prev: AiDraft, formData: FormData) => Promise<AiDraft>;
}) {
  const [state, runAction, isPending] = useActionState(action, { ok: false });

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-strong">FDA Ghana Cosmetic Claim Compliance Scanner</h3>
          <p className="mt-0.5 text-xs text-muted">
            Audit product descriptions and ingredients against cosmetic regulations to flag prohibited medical claims.
          </p>
        </div>

        <form action={runAction}>
          <input type="hidden" name="productId" value={productId} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-paper transition-all hover:bg-forest/90 disabled:opacity-50"
          >
            {isPending ? "Auditing Copy..." : "Scan FDA Compliance"}
          </button>
        </form>
      </div>

      {state.error && (
        <p className="text-xs font-medium text-[var(--blocked)]">{state.error}</p>
      )}

      {state.ok && state.text && (
        <div className="rounded-xl border border-line bg-surface-sunken p-4 space-y-3">
          <div className="flex items-center justify-between text-[0.68rem] text-muted border-b border-line pb-2">
            <span>FDA Ghana Audit Summary</span>
            {state.model && <span>{state.model} ({state.ms}ms)</span>}
          </div>
          <div className="prose prose-sm text-xs text-body whitespace-pre-wrap leading-relaxed">
            {state.text}
          </div>
        </div>
      )}
    </div>
  );
}
