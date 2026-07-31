import { listAdminVariants } from "@/db/queries/admin";
import { StockTable } from "@/components/admin/StockTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stock" };

/**
 * Stock.
 *
 * The list is already sorted out-of-stock → low → healthy by the query, because
 * this screen exists to answer "what needs restocking" and an alphabetical list
 * makes you hunt for it.
 */
export default async function AdminStockPage() {
  const variants = await listAdminVariants();

  const out = variants.filter((v) => v.trackStock && v.stockQty <= 0).length;
  const low = variants.filter(
    (v) => v.trackStock && v.stockQty > 0 && v.stockQty <= v.lowStockThreshold,
  ).length;
  const untracked = variants.filter((v) => !v.trackStock).length;

  return (
    <div>
      <h1 className="text-2xl">Stock</h1>
      <p className="mt-2 text-sm text-muted">
        Every sellable size. Adjust with a reason so the history stays honest.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-red-600 dark:text-red-400">
          {out} out of stock
        </span>
        <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-400">
          {low} running low
        </span>
        <span className="rounded-full bg-surface-sunken px-3 py-1.5 text-muted">
          {untracked} not tracked
        </span>
      </div>

      {variants.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-line bg-surface-sunken p-8 text-center text-sm text-muted">
          Nothing to show yet — connect a database and run the seed.
        </p>
      ) : (
        <StockTable variants={variants} />
      )}
    </div>
  );
}
