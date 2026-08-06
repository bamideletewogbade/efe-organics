import Link from "next/link";

import { bulkUpdateVariantsAction } from "@/app/admin/actions";
import { Empty, PageHeader } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { listAllVariantsForBulk } from "@/db/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk matrix edit" };

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs text-body focus:border-accent focus:outline-none";

export default async function BulkProductsPage() {
  const variantRows = await listAllVariantsForBulk();

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/admin/products" className="hover:text-accent-quiet">
          Products
        </Link>
        <span aria-hidden> / </span>
        <span className="text-strong">Bulk matrix edit</span>
      </nav>

      <ActionForm action={bulkUpdateVariantsAction}>
        <PageHeader
          title="Bulk price & stock matrix"
          description="Update pricing and inventory quantities across all product sizes in a single action."
          meta={`${variantRows.length} total SKUs`}
          action={
            <div className="flex items-center gap-3">
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-muted hover:text-strong"
              >
                Back to products
              </Link>
              <SubmitButton>Save All Bulk Changes</SubmitButton>
            </div>
          }
        />

        {variantRows.length === 0 ? (
          <div className="mt-6">
            <Empty
              title="No variants found"
              body="Ensure your database is connected and seeded with product variants."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[50rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-sunken text-left font-semibold text-strong">
                  <th scope="col" className="px-4 py-3">Product Name</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Size Label</th>
                  <th scope="col" className="px-4 py-3 w-32">Price (GH₵)</th>
                  <th scope="col" className="px-4 py-3 w-32">RRP Was (GH₵)</th>
                  <th scope="col" className="px-4 py-3 w-28">Stock Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {variantRows.map((v) => (
                  <tr key={v.variantId} className="hover:bg-surface-sunken/40">
                    <td className="px-4 py-2.5 font-medium text-strong">
                      <input type="hidden" name="variantId" value={v.variantId} />
                      <Link
                        href={`/admin/products/${v.productId}`}
                        className="hover:text-accent-quiet hover:underline"
                      >
                        {v.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {v.categoryName ?? "Uncategorised"}
                    </td>
                    <td className="px-4 py-2.5 text-strong font-medium">
                      {v.sizeLabel ?? "One size"}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name={`price_${v.variantId}`}
                        defaultValue={(v.priceMinor / 100).toFixed(2)}
                        className={field}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name={`compareAt_${v.variantId}`}
                        defaultValue={
                          v.compareAtMinor !== null
                            ? (v.compareAtMinor / 100).toFixed(2)
                            : ""
                        }
                        placeholder="None"
                        className={field}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        name={`stock_${v.variantId}`}
                        defaultValue={v.stockQty}
                        className={field}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {variantRows.length > 0 && (
          <div className="mt-6 flex justify-end">
            <SubmitButton>Save All Bulk Changes</SubmitButton>
          </div>
        )}
      </ActionForm>
    </div>
  );
}
