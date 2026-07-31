import Image from "next/image";

import { listAdminProducts } from "@/db/queries/admin";
import { setProductStatusAction } from "@/app/admin/actions";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div>
      <h1 className="text-2xl">Products</h1>
      <p className="mt-2 text-sm text-muted">
        {products.length} products, grouped by size family. Prices and stock live
        on each size.
      </p>

      {products.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-line bg-surface-sunken p-8 text-center text-sm text-muted">
          Nothing here yet — connect a database and run{" "}
          <code>npm run db:seed</code>.
        </p>
      ) : (
        <div className="mt-6 grid gap-3">
          {products.map((product) => {
            const priceLabel =
              product.minPriceMinor === null
                ? "—"
                : product.minPriceMinor === product.maxPriceMinor
                  ? formatPrice(product.minPriceMinor)
                  : `${formatPrice(product.minPriceMinor)} – ${formatPrice(
                      product.maxPriceMinor ?? product.minPriceMinor,
                    )}`;

            return (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-raised p-4"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      aria-hidden
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-strong">{product.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {product.categoryName ?? "Uncategorised"} ·{" "}
                    {product.variantCount}{" "}
                    {product.variantCount === 1 ? "size" : "sizes"} ·{" "}
                    {priceLabel}
                    {product.line === "flagship" && " · flagship"}
                  </p>
                </div>

                {/* Stock signals, only when there is something to say. */}
                <div className="flex gap-2 text-xs">
                  {product.outOfStockCount > 0 && (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-600 dark:text-red-400">
                      {product.outOfStockCount} out
                    </span>
                  )}
                  {product.lowStockCount > 0 && (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
                      {product.lowStockCount} low
                    </span>
                  )}
                </div>

                <form action={setProductStatusAction} className="flex gap-1.5">
                  <input type="hidden" name="productId" value={product.id} />
                  <select
                    name="status"
                    defaultValue={product.status}
                    className="rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
                  >
                    <option value="active">Live</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-paper"
                  >
                    Save
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
