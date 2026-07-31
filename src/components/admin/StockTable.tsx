"use client";

import { useState } from "react";

import { adjustStockAction, setStockSettingsAction } from "@/app/admin/actions";
import type { AdminVariantRow } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

/**
 * Stock table.
 *
 * Adjustments are **deltas with a reason**, not "type the new number". Two
 * reasons: two people editing at once compose correctly instead of clobbering
 * each other, and every movement lands in `stock_ledger` so "where did 20 bars
 * go?" has an answer. An absolute field would throw that history away on every
 * edit.
 *
 * The quick +1/−1/+10 buttons exist because the real job is counting a shelf,
 * and typing into a form for each item is slower than tapping.
 */
export function StockTable({ variants }: { variants: AdminVariantRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Stock levels for every product size
        </caption>
        <thead>
          <tr className="border-b border-line bg-surface-sunken text-left">
            <th scope="col" className="px-4 py-3 font-semibold text-strong">
              Product
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-strong">
              Size
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-strong">
              Price
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-strong">
              In stock
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-strong">
              Adjust
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => {
            const outOfStock = variant.trackStock && variant.stockQty <= 0;
            const lowStock =
              variant.trackStock &&
              variant.stockQty > 0 &&
              variant.stockQty <= variant.lowStockThreshold;

            return (
              <tr
                key={variant.id}
                className="border-b border-line last:border-b-0 hover:bg-surface-sunken/50"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-strong">
                    {variant.productName}
                  </span>
                  {variant.channel === "trade" && (
                    <span className="ml-2 rounded-full bg-surface-sunken px-2 py-0.5 text-[0.65rem] text-muted">
                      trade
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {variant.sizeLabel ?? "—"}
                </td>
                <td className="stat px-4 py-3 text-right text-strong">
                  {formatPrice(variant.priceMinor)}
                </td>
                <td className="px-4 py-3 text-right">
                  {!variant.trackStock ? (
                    <span className="text-xs text-muted">not tracked</span>
                  ) : (
                    <span
                      className={`stat rounded-full px-2.5 py-1 ${
                        outOfStock
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : lowStock
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "text-strong"
                      }`}
                    >
                      {variant.stockQty}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {[-1, 1, 10].map((delta) => (
                      <form key={delta} action={adjustStockAction}>
                        <input type="hidden" name="variantId" value={variant.id} />
                        <input type="hidden" name="delta" value={delta} />
                        <input
                          type="hidden"
                          name="reason"
                          value={delta > 0 ? "restock" : "manual_adjustment"}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-strong"
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      </form>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setOpen(open === variant.id ? null : variant.id)
                      }
                      aria-expanded={open === variant.id}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-strong"
                    >
                      More
                    </button>
                  </div>

                  {open === variant.id && (
                    <div className="mt-3 flex flex-col gap-3 rounded-xl bg-surface-sunken p-3 text-left">
                      <form
                        action={adjustStockAction}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="variantId" value={variant.id} />
                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] text-muted">
                            Change by
                          </span>
                          <input
                            name="delta"
                            type="number"
                            required
                            placeholder="e.g. 24 or -3"
                            className="w-28 rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] text-muted">
                            Reason
                          </span>
                          <select
                            name="reason"
                            className="rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
                          >
                            <option value="restock">Restock</option>
                            <option value="manual_adjustment">Recount</option>
                            <option value="damage">Damage</option>
                            <option value="return">Return</option>
                          </select>
                        </label>
                        <label className="block flex-1">
                          <span className="mb-1 block text-[0.65rem] text-muted">
                            Note
                          </span>
                          <input
                            name="note"
                            className="w-full rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-paper"
                        >
                          Apply
                        </button>
                      </form>

                      <form
                        action={setStockSettingsAction}
                        className="flex flex-wrap items-end gap-3 border-t border-line pt-3"
                      >
                        <input type="hidden" name="variantId" value={variant.id} />
                        <label className="flex items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            name="trackStock"
                            defaultChecked={variant.trackStock}
                          />
                          Track stock for this size
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] text-muted">
                            Warn at
                          </span>
                          <input
                            name="lowStockThreshold"
                            type="number"
                            min={0}
                            defaultValue={variant.lowStockThreshold}
                            className="w-20 rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-strong"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
