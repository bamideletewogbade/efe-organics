import { Empty, PageHeader, Pill } from "@/components/admin/AdminUI";
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
      <PageHeader
        title="Stock"
        description="Every sellable size. Adjust with a reason so the history stays honest."
        meta={
          variants.length > 0 ? `${variants.length} sizes tracked` : undefined
        }
        action={
          variants.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {/* Only the counts that mean something appear. A row of zeroes
                  trains the eye to ignore the whole strip. */}
              {out > 0 && <Pill tone="bad">{out} out of stock</Pill>}
              {low > 0 && <Pill tone="warn">{low} running low</Pill>}
              {out === 0 && low === 0 && (
                <Pill tone="good">Everything in stock</Pill>
              )}
              {untracked > 0 && <Pill>{untracked} not tracked</Pill>}
            </div>
          ) : undefined
        }
      />

      {variants.length === 0 ? (
        <Empty
          title="No stock to show"
          body="Sizes appear here once the catalogue is loaded. Connect a database and run the seed."
        />
      ) : (
        <StockTable variants={variants} />
      )}
    </div>
  );
}
