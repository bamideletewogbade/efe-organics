"use client";

import { ActionForm, SubmitButton } from "@/components/admin/Form";
import type { ActionState } from "@/lib/action-state";

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-strong";

export function InvoiceGenerator({
  action,
}: {
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-strong">Mint B2B Wholesale Invoice</h3>
        <p className="mt-1 text-xs text-muted">
          Issue a custom B2B invoice for bulk 250kg soap crumble or salon 1L orders.
        </p>
      </div>

      <ActionForm action={action} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Business Name *</span>
            <input
              name="businessName"
              required
              placeholder="e.g. Royal Spa & Beauty Kumasi"
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Contact Email *</span>
            <input
              name="email"
              type="email"
              required
              placeholder="orders@royalspa.gh"
              className={field}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Phone / WhatsApp</span>
            <input name="phone" placeholder="024 000 0000" className={field} />
          </label>

          <label className="block">
            <span className={label}>Base Amount (GH₵) *</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="13750.00"
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Tier Discount (%)</span>
            <input
              name="discount"
              type="number"
              step="0.1"
              min="0"
              max="50"
              defaultValue="10"
              placeholder="10"
              className={field}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Region</span>
            <input name="region" defaultValue="Greater Accra" className={field} />
          </label>

          <label className="block">
            <span className={label}>Town / City</span>
            <input name="town" defaultValue="Accra" className={field} />
          </label>
        </div>

        <label className="block">
          <span className={label}>Internal / Customer Notes</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="e.g. 1/4 Tonne African Black Soap Crumble Batch #402"
            className={`${field} resize-y`}
          />
        </label>

        <SubmitButton className="justify-self-start">
          Mint & Issue B2B Invoice
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
