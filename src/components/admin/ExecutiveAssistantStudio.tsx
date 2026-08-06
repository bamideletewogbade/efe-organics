"use client";

import { useState, useActionState } from "react";
import type { AiDraft } from "@/app/admin/ai-actions";
import { SubmitButton } from "@/components/admin/Form";

const field =
  "w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-body placeholder:text-muted/60 focus:border-accent focus:outline-none";

export function ExecutiveAssistantStudio({
  askAction,
  hasAi,
}: {
  askAction: (_prev: AiDraft, formData: FormData) => Promise<AiDraft>;
  hasAi: boolean;
}) {
  const [state, formAction, isPending] = useActionState(askAction, { ok: false });
  const [activeTab, setActiveTab] = useState<"accounting" | "marketing" | "supply" | "support">(
    "accounting",
  );
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const TABS = [
    { id: "accounting", label: "💰 Accounting & Financials" },
    { id: "marketing", label: "📣 Marketing & Campaigns" },
    { id: "supply", label: "📦 Supply Chain & Cooking" },
    { id: "support", label: "💬 Customer Care" },
  ] as const;

  const PROMPTS: Record<typeof activeTab, Array<{ title: string; prompt: string }>> = {
    accounting: [
      {
        title: "Financial Audit",
        prompt: "Generate a weekly financial audit summarizing paid revenue, total orders, and average order value.",
      },
      {
        title: "Unpaid MoMo Orders",
        prompt: "List all unpaid Mobile Money orders needing transaction reference verification.",
      },
      {
        title: "Revenue by Town",
        prompt: "Analyze our sales breakdown between East Legon, Spintex, Airport Residential, and Kumasi.",
      },
    ],
    marketing: [
      {
        title: "Lemon Blast Drop",
        prompt: "Draft an Instagram caption, TikTok script, and WhatsApp broadcast for the Lemon Blast Black Soap 350ml drop.",
      },
      {
        title: "Wholesale & Salon Campaign",
        prompt: "Write a trade email proposal for salons offering 1L black soap professional formats.",
      },
      {
        title: "Raw Crumble Spotlight",
        prompt: "Draft a B2B announcement for formulators highlighting our 250kg Raw African Black Soap Crumble.",
      },
    ],
    supply: [
      {
        title: "Raw Soap Ingredients",
        prompt: "Calculate raw material needs (palm kernel oil, cocoa pod ash, shea butter) for batch cooking low-stock black soaps.",
      },
      {
        title: "14-Day Cooking Schedule",
        prompt: "Create a 14-day production cooking schedule for the workshop team based on current stock levels.",
      },
      {
        title: "Stockout Alert",
        prompt: "Identify all SKUs currently out of stock or running below threshold.",
      },
    ],
    support: [
      {
        title: "VIP Re-engagement",
        prompt: "Draft a personalized WhatsApp follow-up for repeat customers who haven't ordered in 30 days.",
      },
      {
        title: "Ghana Shipping Protocol",
        prompt: "Explain our delivery quote calculator rates for East Legon, Spintex, Kumasi, and Takoradi.",
      },
      {
        title: "MoMo Transfer Help",
        prompt: "Write instructions for a customer asking how to complete their Mobile Money transaction reference input.",
      },
    ],
  };

  const handlePromptClick = (p: string) => {
    setQuery(p);
  };

  return (
    <div className="space-y-6">
      {/* 1. Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-forest text-paper shadow-sm"
                : "bg-surface-raised text-muted hover:border-line hover:text-strong border border-line/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. One-Click Prompt Launchers */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PROMPTS[activeTab].map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => handlePromptClick(item.prompt)}
            className="flex flex-col text-left rounded-2xl border border-line bg-surface-raised p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md group"
          >
            <span className="font-semibold text-strong text-xs group-hover:text-accent-quiet">
              {item.title} &rarr;
            </span>
            <span className="mt-1 text-[0.72rem] text-muted line-clamp-2">
              {item.prompt}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Natural Language Query Input */}
      <form action={formAction} className="rounded-2xl border border-line bg-surface-raised p-5 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-strong">
            Execute Custom AI Task or Query
          </span>
          <textarea
            name="question"
            rows={3}
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any operational task or question grounded live in catalogue, orders, stockists, and stock..."
            className={`${field} resize-y`}
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            Grounded strictly in Efe Organics database facts.
          </span>
          <button
            type="submit"
            disabled={isPending || !hasAi}
            className="rounded-xl bg-forest px-5 py-2.5 text-xs font-semibold text-paper transition-all hover:bg-forest/90 disabled:opacity-50"
          >
            {isPending ? "Executing AI Task..." : "Execute Task"}
          </button>
        </div>

        {state.error && (
          <p className="text-xs font-medium text-[var(--blocked)]">{state.error}</p>
        )}
      </form>

      {/* 4. Output Display Panel */}
      {state.ok && state.text && (
        <div className="rounded-2xl border border-line bg-surface-sunken p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-semibold text-strong text-xs uppercase tracking-wider">
              Executive AI Output
            </h3>

            <div className="flex items-center gap-3">
              {state.model && (
                <span className="text-[0.68rem] text-muted">
                  Model: {state.model} ({state.ms}ms)
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(state.text || "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-strong transition-colors hover:border-accent/50"
              >
                {copied ? "✓ Copied" : "Copy Output"}
              </button>
            </div>
          </div>

          <div className="prose prose-sm text-xs text-body whitespace-pre-wrap leading-relaxed">
            {state.text}
          </div>
        </div>
      )}
    </div>
  );
}
