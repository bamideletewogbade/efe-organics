"use client";

import { useState, useActionState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AiDraft } from "@/app/admin/ai-actions";

export function OrderAiAnalyst({
  orderId,
  action,
}: {
  orderId: string;
  action: (_prev: AiDraft, formData: FormData) => Promise<AiDraft>;
}) {
  const [state, runAction, isPending] = useActionState(action, { ok: false });
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-gold animate-pulse" />
            <h3 className="font-semibold text-strong text-base">AI Customer & Reorder Analyst</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            Predict replenishment dates, customer value segments, and draft WhatsApp re-engagement.
          </p>
        </div>

        <form action={runAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-forest px-4 py-2 text-xs font-semibold text-paper shadow-sm transition-all hover:scale-105 hover:bg-forest/90 disabled:opacity-50"
          >
            {isPending ? "Analyzing Order Facts..." : "✨ Run AI Analysis"}
          </button>
        </form>
      </div>

      {state.error && (
        <p className="text-xs font-medium text-[var(--blocked)]">{state.error}</p>
      )}

      <AnimatePresence>
        {state.ok && state.text && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-line bg-surface-sunken p-5 space-y-3"
          >
            <div className="flex items-center justify-between text-[0.68rem] text-muted border-b border-line pb-2">
              <span className="font-semibold uppercase tracking-wider text-accent-quiet">
                Grounded Customer Intelligence
              </span>
              <div className="flex items-center gap-3">
                {state.model && <span>{state.model} ({state.ms}ms)</span>}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(state.text || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-strong transition-colors hover:border-accent/50"
                >
                  {copied ? "✓ Copied" : "Copy Insight"}
                </button>
              </div>
            </div>

            <div className="prose prose-sm text-xs text-body whitespace-pre-wrap leading-relaxed">
              {state.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
