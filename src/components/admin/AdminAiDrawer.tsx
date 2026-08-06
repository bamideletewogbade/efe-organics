"use client";

import { useState, useActionState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AiDraft } from "@/app/admin/ai-actions";

export function AdminAiDrawer({
  askAction,
  hasAi,
}: {
  askAction: (state: AiDraft, formData: FormData) => Promise<AiDraft>;
  hasAi: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(askAction, { ok: false });
  const [query, setQuery] = useState("");

  if (!hasAi) return null;

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-saffron/40 bg-forest px-4 py-3 text-xs font-semibold text-paper shadow-2xl transition-all hover:scale-105 hover:bg-forest/90 active:scale-95"
      >
        <span className="flex h-2 w-2 rounded-full bg-gold animate-pulse" />
        <span>Ask AI Copilot</span>
      </button>

      {/* Slide-over Drawer Backdrop & Panel */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-forest-deep/60 backdrop-blur-xs transition-opacity"
            />

            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className="w-screen max-w-md border-l border-line bg-surface p-6 shadow-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-gold" />
                      <h2 className="font-semibold text-strong text-base">Efe Back-Office AI Copilot</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1 text-muted hover:text-strong hover:bg-surface-sunken"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-muted">
                    Ask questions grounded live in products, stock levels, orders, and registered stockists.
                  </p>

                  <form action={formAction} className="mt-4 grid gap-3">
                    <input
                      name="question"
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Unpaid MoMo orders in Accra..."
                      className="w-full rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5 text-xs text-body placeholder:text-muted/60 focus:border-accent focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-paper transition-all hover:bg-forest/90 disabled:opacity-50 justify-self-start"
                    >
                      {isPending ? "Searching Shop Data..." : "Ask Copilot"}
                    </button>
                  </form>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[
                      "Unpaid MoMo orders",
                      "Out of stock SKUs",
                      "Best sellers this week",
                      "Gold tier stockists",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setQuery(chip)}
                        className="rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-[0.7rem] text-muted hover:border-accent/40 hover:text-strong"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {state.error && (
                    <p className="mt-4 text-xs font-medium text-[var(--blocked)]">{state.error}</p>
                  )}

                  {state.ok && state.text && (
                    <div className="mt-5 max-h-[50vh] overflow-y-auto rounded-xl border border-line bg-surface-sunken p-4 space-y-2">
                      <div className="flex items-center justify-between text-[0.65rem] text-muted border-b border-line pb-2">
                        <span>Grounded Answer</span>
                        {state.model && <span>{state.model} ({state.ms}ms)</span>}
                      </div>
                      <p className="whitespace-pre-wrap text-xs text-body leading-relaxed">
                        {state.text}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-line pt-3 text-[0.68rem] text-muted">
                  Efe AI Assistant • Answers strictly grounded in shop database facts.
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
