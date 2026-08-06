import { askShopAction } from "@/app/admin/ai-actions";
import { Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ExecutiveAssistantStudio } from "@/components/admin/ExecutiveAssistantStudio";
import { capabilities } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Executive Assistant Workstation" };

export default function AdminAssistantPage() {
  return (
    <div>
      <PageHeader
        title="Executive AI Assistant Workstation"
        description="Grounded AI Copilot for financial audits, multi-channel marketing campaigns, supply chain cooking schedules, and customer care."
        action={
          <Pill tone={capabilities.hasAI ? "good" : "warn"}>
            {capabilities.hasAI ? "AI Copilot Online" : "AI Unconfigured"}
          </Pill>
        }
      />

      {!capabilities.hasAI && (
        <div className="mt-6 rounded-2xl border border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_7%,transparent)] p-5">
          <p className="text-sm font-semibold text-strong">
            OpenRouter AI Key Required
          </p>
          <p className="measure mt-1.5 text-sm/6 text-muted">
            Configure <code>OPENROUTER_API_KEY</code> in your <code>.env.local</code> file to enable live AI task execution.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="mb-4">
            <h2 className="font-semibold text-strong text-base">Operational Task Studio</h2>
            <p className="text-xs text-muted mt-0.5">
              Select an operational pillar or type a custom natural language instruction.
            </p>
          </div>

          <ExecutiveAssistantStudio
            askAction={askShopAction}
            hasAi={capabilities.hasAI}
          />
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-strong">Grounded Back-Office Security</h2>
            <p className="mt-2 text-xs/5 text-muted">
              Unlike generic AI chatbots, the Efe AI Assistant is strictly grounded live in your Postgres storefront database.
            </p>

            <ul className="mt-4 space-y-2.5 text-xs text-muted">
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> Grounded in real catalogue prices & sizes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> Queries live order status & MoMo references
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> Inspects stock levels & restock thresholds
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--live)] font-bold">✓</span> Enforces FDA Ghana cosmetic claim rules
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
