import Image from "next/image";
import Link from "next/link";

import { Empty, PageHeader, Pill } from "@/components/admin/AdminUI";
import { listAdminProducts } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

const STATUS_TONE = {
  active: "good",
  draft: "warn",
  archived: "neutral",
} as const;

const STATUS_LABEL = {
  active: "Live",
  draft: "Draft",
  archived: "Archived",
} as const;

/**
 * Products.
 *
 * The row is a link now rather than a status dropdown. Changing whether a
 * product was live was the only thing this screen could do, which made it a
 * list you could not really act on: fixing a price or a description meant going
 * to the database. Editing lives on the product's own page where there is room
 * to do it properly, and the list goes back to being a list.
 *
 * Stock warnings show only when something is wrong. A badge that is always
 * there is furniture; one that appears is a signal.
 */
export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  const live = products.filter((p) => p.status === "active").length;
  const needsStock = products.filter(
    (p) => p.outOfStockCount > 0 || p.lowStockCount > 0,
  ).length;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Grouped by size family. Prices and stock live on each size, not on the product."
        meta={
          products.length > 0
            ? `${products.length} products, ${live} live`
            : undefined
        }
        action={
          needsStock > 0 ? (
            <Pill tone="warn">{needsStock} need stock</Pill>
          ) : undefined
        }
      />

      {products.length === 0 ? (
        <Empty
          title="No products yet"
          body="The catalogue loads from the database. Connect one and run the seed to import the range."
        />
      ) : (
        <div className="mt-6 grid gap-2.5">
          {products.map((product) => {
            const priceLabel =
              product.minPriceMinor === null
                ? "No price set"
                : product.minPriceMinor === product.maxPriceMinor
                  ? formatPrice(product.minPriceMinor)
                  : `${formatPrice(product.minPriceMinor)} to ${formatPrice(
                      product.maxPriceMinor ?? product.minPriceMinor,
                    )}`;

            return (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="group flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-raised p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_28px_-20px_rgb(20_67_44_/_0.5)]"
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

                <div className="flex flex-wrap items-center gap-2">
                  {product.outOfStockCount > 0 && (
                    <Pill tone="bad">{product.outOfStockCount} out</Pill>
                  )}
                  {product.lowStockCount > 0 && (
                    <Pill tone="warn">{product.lowStockCount} low</Pill>
                  )}
                  <Pill tone={STATUS_TONE[product.status]}>
                    {STATUS_LABEL[product.status]}
                  </Pill>
                  <span
                    aria-hidden
                    className="text-muted transition-transform group-hover:translate-x-0.5"
                  >
                    &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
