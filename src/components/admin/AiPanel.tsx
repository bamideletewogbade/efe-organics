"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { AiDraft } from "@/app/admin/ai-actions";

/**
 * The assistant's shared surface.
 *
 * THREE THINGS IT ALWAYS DOES, AND THEY ARE THE POINT
 *
 * 1. **Never saves.** A draft appears in a box with a Copy button. Getting it
 *    into the shop means pasting it into the field and pressing Save, which is
 *    a deliberate human act. An assistant that writes straight to the catalogue
 *    turns "this description is wrong" into a question with no answer, and for
 *    a cosmetics business a wrong description is a claim, not a typo.
 *
 * 2. **Says where it came from.** Which model served, roughly what it cost, how
 *    long it took. A fallback firing is shown, because that usually means the
 *    primary is rate limited and noticing it here beats noticing it on a bill.
 *
 * 3. **Says it is a draft.** Every output is captioned as unchecked. The whole
 *    risk with fluent text is that it reads exactly as authoritative whether or
 *    not it is right.
 */

function RunButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-saffron/10 px-4 py-2 text-sm font-semibold text-accent-quiet transition-colors hover:bg-saffron/15 disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
      {pending ? "Thinking" : label}
    </button>
  );
}

function Output({ state }: { state: AiDraft }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);

  if (!state.ok && !state.error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        {state.error ? (
          <p role="alert" className="text-sm text-[var(--blocked)]">
            {state.error}
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-line bg-surface-sunken p-4">
              <p className="whitespace-pre-wrap text-sm/6 text-body">
                {state.text}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(state.text ?? "");
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-accent/50"
              >
                {copied ? "Copied" : "Copy"}
              </button>

              {/*
                Provenance, always. Not a debugging aid: the model that answered
                and what it cost are the two facts somebody running this shop
                will want when the bill or the quality changes.
              */}
              <p className="text-xs text-muted">
                {state.model}
                {state.usedFallback && (
                  <span className="text-[var(--progress)]">
                    {" "}
                    (fallback, the first choice was unavailable)
                  </span>
                )}
                {state.cents != null && ` · about ${state.cents.toFixed(3)}¢`}
                {state.ms != null && ` · ${(state.ms / 1000).toFixed(1)}s`}
              </p>
            </div>

            <p className="mt-2 text-xs/5 text-muted">
              A draft, not checked. Read it before it goes anywhere near the
              shop, especially anything that sounds like a promise about skin.
            </p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/** Buttons that draft one field of a product page. */
export function ProductCopyPanel({
  productId,
  action,
}: {
  productId: string;
  action: (state: AiDraft, formData: FormData) => Promise<AiDraft>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-accent/30 bg-saffron/[0.03] p-5">
      <h3 className="text-sm font-semibold text-strong">
        Draft this with the assistant
      </h3>
      <p className="measure mt-1 text-xs/5 text-muted">
        Written only from this product&rsquo;s own ingredient list and existing
        text. It will not invent an ingredient or claim a result. Nothing is
        saved until you paste it in and press Save.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="productId" value={productId} />
        {[
          { kind: "blurb", label: "One-line blurb" },
          { kind: "description", label: "Full description" },
          { kind: "howToUse", label: "How to use" },
        ].map((option) => (
          <button
            key={option.kind}
            type="submit"
            name="kind"
            value={option.kind}
            className="rounded-full border border-accent/40 bg-saffron/10 px-4 py-2 text-sm font-semibold text-accent-quiet transition-colors hover:bg-saffron/15"
          >
            {option.label}
          </button>
        ))}
      </form>

      <Output state={state} />
    </div>
  );
}

/** A question box over the whole catalogue and live stock. */
export function AskShopPanel({
  action,
}: {
  action: (state: AiDraft, formData: FormData) => Promise<AiDraft>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const [query, setQuery] = useState("");

  const examples = [
    "Which products contain shea butter?",
    "What are our recent orders in Accra?",
    "Are there any unpaid MoMo orders?",
    "Which products are low on stock?",
    "Show me registered stockist accounts",
  ];

  return (
    <div>
      <form action={formAction} className="grid gap-3">
        <label className="block">
          <span className="sr-only">Ask a question about the shop</span>
          <input
            name="question"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about orders, stock, products, or stockists..."
            className="w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-body placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <RunButton label="Ask Assistant" />
          <span className="text-xs text-muted">
            Grounded live in your catalogue, orders, stockists, and stock.
          </span>
        </div>
      </form>

      <ul className="mt-4 flex flex-wrap gap-2">
        {examples.map((example) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => setQuery(example)}
              className="rounded-full border border-line/60 bg-surface-sunken px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-strong"
            >
              {example}
            </button>
          </li>
        ))}
      </ul>

      <Output state={state} />
    </div>
  );
}
