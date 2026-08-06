import Link from "next/link";

import { createB2BInvoiceAction, setStockistStatusAction } from "@/app/admin/actions";
import { Card, Empty, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { InvoiceGenerator } from "@/components/admin/InvoiceGenerator";
import { listAdminStockists, type StockistRow } from "@/db/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stockists & Wholesale" };

const TIER_TONE: Record<string, "neutral" | "info" | "warn" | "good"> = {
  bronze: "neutral",
  silver: "info",
  gold: "warn",
  vip: "good",
};

const STATUS_TONE: Record<string, "neutral" | "info" | "warn" | "good" | "bad"> = {
  pending: "warn",
  approved: "good",
  declined: "bad",
};

export default async function AdminStockistsPage() {
  const stockistList: StockistRow[] = await listAdminStockists();

  const pendingCount = stockistList.filter((s: StockistRow) => s.status === "pending").length;
  const approvedCount = stockistList.filter((s: StockistRow) => s.status === "approved").length;

  return (
    <div>
      <PageHeader
        title="Stockists & B2B Wholesale"
        description="Manage salon/spa resellers, pharmacy stockists, bulk soap crumble accounts, and B2B invoices."
        meta={`${stockistList.length} total stockist accounts (${approvedCount} approved)`}
        action={
          <div className="flex items-center gap-2.5">
            {pendingCount > 0 && <Pill tone="warn">{pendingCount} pending review</Pill>}
            <a
              href="/admin/stockists/price-list"
              download
              className="rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-paper transition-all hover:bg-forest/90"
            >
              Download Wholesale Price List (CSV)
            </a>
          </div>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-strong mb-4">Registered Stockists</h2>

          {stockistList.length === 0 ? (
            <Empty
              title="No stockist applications yet"
              body="Reseller & partner inquiries submitted through the /partners page appear here."
            />
          ) : (
            <div className="space-y-4">
              {stockistList.map((s) => (
                <Card key={s.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                    <div>
                      <h3 className="font-semibold text-strong text-base">{s.businessName}</h3>
                      <p className="text-xs text-muted">
                        {s.contactName} · {s.email} · {s.phone}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Pill tone={TIER_TONE[s.tier]}>{s.tier.toUpperCase()} TIER</Pill>
                      <Pill tone={STATUS_TONE[s.status]}>{s.status}</Pill>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      Type: <span className="font-medium text-strong capitalize">{s.businessType.replace("_", " ")}</span>
                      {s.town && ` · Location: ${s.town}, ${s.region || "Ghana"}`}
                    </p>

                    <ActionForm action={setStockistStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="stockistId" value={s.id} />

                      <select
                        name="tier"
                        defaultValue={s.tier}
                        className="rounded-lg border border-line bg-surface-raised px-2 py-1 text-xs"
                      >
                        <option value="bronze">Bronze (10%)</option>
                        <option value="silver">Silver (15%)</option>
                        <option value="gold">Gold (20%)</option>
                        <option value="vip">VIP (25%)</option>
                      </select>

                      <select
                        name="status"
                        defaultValue={s.status}
                        className="rounded-lg border border-line bg-surface-raised px-2 py-1 text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="declined">Declined</option>
                      </select>

                      <SubmitButton variant="quiet" className="text-xs py-1">
                        Update
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <InvoiceGenerator action={createB2BInvoiceAction} />
        </div>
      </div>
    </div>
  );
}
