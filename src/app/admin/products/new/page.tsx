import Link from "next/link";
import { redirect } from "next/navigation";

import { createProductAction } from "@/app/admin/actions";
import { Card, PageHeader } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { getDb } from "@/db/client";
import { categories } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-strong";

export default async function NewProductPage() {
  const db = getDb();
  const categoryList = db
    ? await db.select({ id: categories.id, name: categories.name }).from(categories)
    : [];

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/admin/products" className="hover:text-accent-quiet">
          Products
        </Link>
        <span aria-hidden> / </span>
        <span className="text-strong">New product</span>
      </nav>

      <PageHeader
        title="Add new product"
        description="Create a new shelf product line. You can add additional sizes and images after creating it."
      />

      <div className="mt-6 max-w-3xl">
        <Card>
          <ActionForm action={createProductAction} className="grid gap-4">
            <label className="block">
              <span className={label}>Product Name *</span>
              <input
                name="name"
                required
                placeholder="e.g. Lavender & Honey Black Soap"
                className={field}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={label}>Status</span>
                <select name="status" defaultValue="draft" className={field}>
                  <option value="draft">Draft (hidden from shop)</option>
                  <option value="active">Live (published)</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="block">
                <span className={label}>Category</span>
                <select name="categoryId" className={field}>
                  <option value="">Uncategorised</option>
                  {categoryList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={label}>Prominence</span>
                <select name="line" defaultValue="supporting" className={field}>
                  <option value="supporting">Supporting</option>
                  <option value="flagship">Flagship Range</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Initial Size Label</span>
                <input
                  name="sizeLabel"
                  defaultValue="350ml"
                  placeholder="e.g. 350ml, 500g, One Size"
                  className={field}
                />
              </label>

              <label className="block">
                <span className={label}>Initial Price (GH₵) *</span>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="70.00"
                  className={field}
                />
              </label>
            </div>

            <label className="block">
              <span className={label}>Short blurb</span>
              <input
                name="blurb"
                placeholder="One sentence summary for the shop card"
                className={field}
              />
            </label>

            <label className="block">
              <span className={label}>Description</span>
              <textarea
                name="description"
                rows={4}
                placeholder="Full product story and features..."
                className={`${field} resize-y`}
              />
            </label>

            <label className="block">
              <span className={label}>Ingredients</span>
              <textarea
                name="ingredients"
                rows={2}
                placeholder="e.g. Cocoa pod ash, unrefined shea butter, palm kernel oil..."
                className={`${field} resize-y`}
              />
            </label>

            <label className="block">
              <span className={label}>How to use</span>
              <textarea
                name="howToUse"
                rows={2}
                placeholder="Directions for use..."
                className={`${field} resize-y`}
              />
            </label>

            <div className="flex flex-wrap gap-5 pt-2">
              <label className="flex items-center gap-2.5 text-sm text-strong cursor-pointer">
                <input
                  type="checkbox"
                  name="isBestSeller"
                  className="h-4 w-4 accent-[var(--color-forest)]"
                />
                Mark as Best Seller
              </label>
              <label className="flex items-center gap-2.5 text-sm text-strong cursor-pointer">
                <input
                  type="checkbox"
                  name="isNew"
                  defaultChecked
                  className="h-4 w-4 accent-[var(--color-forest)]"
                />
                Mark as New Arrival
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <Link
                href="/admin/products"
                className="text-xs text-muted hover:text-strong"
              >
                Cancel
              </Link>
              <SubmitButton>Create Product</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
