import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addProductImageAction,
  removeProductImageAction,
  saveProductAction,
  setVariantPriceAction,
} from "@/app/admin/actions";
import { Card, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { getAdminProduct } from "@/db/queries/admin";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-strong";

/**
 * The product editor.
 *
 * This is the screen that makes the storefront editable without a developer,
 * which was the whole argument for owning a backend instead of renting one.
 *
 * LAID OUT AS THREE SEPARATE FORMS, NOT ONE BIG SAVE.
 *
 * Words, sizes and pictures change on completely different schedules: a price
 * gets corrected in seconds, a description is rewritten once a season. One
 * giant form would mean re-submitting all of it to fix a typo in a price, and
 * every save would be a chance to clobber something someone else just changed.
 *
 * PRICE AND STOCK ARE PER SIZE. That is not a technicality, it is the thing
 * this catalogue got wrong originally: "Lemon Blast" is one shelf entry with
 * three prices, and any form offering a single price box would have to pick one
 * to be wrong about.
 */
export default async function AdminProductEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminProduct(id);
  if (!data) notFound();

  const { product, variants, images, categories } = data;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <Link href="/admin/products" className="hover:text-accent-quiet">
          Products
        </Link>
        <span aria-hidden> / </span>
        <span className="text-strong">{product.name}</span>
      </nav>

      <PageHeader
        title={product.name}
        description={`/shop/${product.slug}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill
              tone={
                product.status === "active"
                  ? "good"
                  : product.status === "draft"
                    ? "warn"
                    : "neutral"
              }
            >
              {product.status === "active"
                ? "Live"
                : product.status === "draft"
                  ? "Draft"
                  : "Archived"}
            </Pill>
            <Link
              href={`/shop/${product.slug}`}
              target="_blank"
              className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-strong transition-colors hover:border-accent/50"
            >
              View on shop
            </Link>
          </div>
        }
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* ---- words ---- */}
        <Card>
          <h2 className="font-semibold text-strong">What it says</h2>
          <p className="mt-1.5 text-sm/6 text-muted">
            The blurb is the line on the shop card. The description is the full
            text on the product page.
          </p>

          <ActionForm action={saveProductAction} className="mt-5 grid gap-4">
            <input type="hidden" name="productId" value={product.id} />

            <label className="block">
              <span className={label}>Name</span>
              <input
                name="name"
                required
                defaultValue={product.name}
                className={field}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={label}>Status</span>
                <select
                  name="status"
                  defaultValue={product.status}
                  className={field}
                >
                  <option value="active">Live</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="block">
                <span className={label}>Range</span>
                <select
                  name="categoryId"
                  defaultValue={product.categoryId ?? ""}
                  className={field}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={label}>Prominence</span>
                <select
                  name="line"
                  defaultValue={product.line}
                  className={field}
                >
                  <option value="flagship">Flagship</option>
                  <option value="supporting">Supporting</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className={label}>Short blurb</span>
              <input
                name="blurb"
                defaultValue={product.blurb ?? ""}
                placeholder="One line, shown on the shop card"
                className={field}
              />
            </label>

            <label className="block">
              <span className={label}>Description</span>
              <textarea
                name="description"
                rows={5}
                defaultValue={product.description ?? ""}
                className={`${field} resize-y`}
              />
            </label>

            <label className="block">
              <span className={label}>
                Ingredients{" "}
                <span className="font-normal text-muted">
                  (shoppers read this, and so will the AI copywriter)
                </span>
              </span>
              <textarea
                name="ingredients"
                rows={3}
                defaultValue={product.ingredients ?? ""}
                className={`${field} resize-y`}
              />
            </label>

            <label className="block">
              <span className={label}>How to use</span>
              <textarea
                name="howToUse"
                rows={3}
                defaultValue={product.howToUse ?? ""}
                className={`${field} resize-y`}
              />
            </label>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2.5 text-sm text-strong">
                <input
                  type="checkbox"
                  name="isBestSeller"
                  defaultChecked={product.isBestSeller}
                  className="h-4 w-4 accent-[var(--color-forest)]"
                />
                Best seller
              </label>
              <label className="flex items-center gap-2.5 text-sm text-strong">
                <input
                  type="checkbox"
                  name="isNew"
                  defaultChecked={product.isNew}
                  className="h-4 w-4 accent-[var(--color-forest)]"
                />
                New
              </label>
            </div>

            <SubmitButton className="justify-self-start">
              Save product
            </SubmitButton>
          </ActionForm>
        </Card>

        <div className="grid gap-5 self-start">
          {/* ---- sizes ---- */}
          <Card>
            <h2 className="font-semibold text-strong">Sizes and prices</h2>
            <p className="mt-1.5 text-sm/6 text-muted">
              Each size is priced on its own. Set the RRP above the price to show
              a saving on the shop.
            </p>

            {variants.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
                This product has no sizes, so it cannot be bought.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="rounded-xl border border-line bg-surface-sunken p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-strong">
                        {variant.sizeLabel ?? "One size"}
                      </span>
                      {variant.trackStock ? (
                        <Pill
                          tone={
                            variant.stockQty <= 0
                              ? "bad"
                              : variant.stockQty <= variant.lowStockThreshold
                                ? "warn"
                                : "good"
                          }
                        >
                          {variant.stockQty <= 0
                            ? "Out of stock"
                            : `${variant.stockQty} in stock`}
                        </Pill>
                      ) : (
                        <Pill>Stock not tracked</Pill>
                      )}
                    </div>

                    <ActionForm
                      action={setVariantPriceAction}
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <input
                        type="hidden"
                        name="variantId"
                        value={variant.id}
                      />
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <label className="block">
                        <span className={label}>Price (GH₵)</span>
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          defaultValue={(variant.priceMinor / 100).toFixed(2)}
                          className={`${field} w-28`}
                        />
                      </label>
                      <label className="block">
                        <span className={label}>Was (GH₵)</span>
                        <input
                          name="compareAt"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={
                            variant.compareAtMinor != null
                              ? (variant.compareAtMinor / 100).toFixed(2)
                              : ""
                          }
                          placeholder="None"
                          className={`${field} w-28`}
                        />
                      </label>
                      <SubmitButton variant="small">Save</SubmitButton>
                    </ActionForm>

                    {variant.compareAtMinor != null &&
                      variant.compareAtMinor > variant.priceMinor && (
                        <p className="mt-2 text-xs text-[var(--live)]">
                          Shows as{" "}
                          {formatPrice(
                            variant.compareAtMinor - variant.priceMinor,
                          )}{" "}
                          off
                        </p>
                      )}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-xs/5 text-muted">
              Stock is adjusted on the{" "}
              <Link href="/admin/stock" className="underline underline-offset-2">
                stock screen
              </Link>
              , where every change records a reason.
            </p>
          </Card>

          {/* ---- pictures ---- */}
          <Card>
            <h2 className="font-semibold text-strong">Pictures</h2>
            <p className="mt-1.5 text-sm/6 text-muted">
              The first picture is the one the shop card uses.
            </p>

            {images.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <li key={image.id} className="group relative">
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-sunken">
                      <Image
                        src={image.url}
                        alt={image.alt ?? ""}
                        fill
                        sizes="120px"
                        className="object-contain p-1.5"
                      />
                      {index === 0 && (
                        <span className="absolute left-1.5 top-1.5">
                          <Pill tone="info">Main</Pill>
                        </span>
                      )}
                    </div>
                    <ActionForm
                      action={removeProductImageAction}
                      className="mt-1.5"
                    >
                      <input type="hidden" name="imageId" value={image.id} />
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <SubmitButton
                        variant="danger"
                        pendingLabel="Removing"
                        className="w-full justify-center"
                      >
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}

            <ActionForm
              action={addProductImageAction}
              className="mt-4 grid gap-3"
              resetOnSuccess
            >
              <input type="hidden" name="productId" value={product.id} />
              <label className="block">
                <span className={label}>Picture address</span>
                <input
                  name="url"
                  required
                  placeholder="/products/lemon-blast-350ml.webp"
                  className={field}
                />
              </label>
              <label className="block">
                <span className={label}>
                  Describe it{" "}
                  <span className="font-normal text-muted">
                    (for screen readers)
                  </span>
                </span>
                <input
                  name="alt"
                  placeholder="A 350ml bottle of Lemon Blast bath"
                  className={field}
                />
              </label>
              <SubmitButton variant="quiet" className="justify-self-start">
                Add picture
              </SubmitButton>
            </ActionForm>

            {/*
              Uploading a file rather than typing an address needs somewhere to
              put it, and that is a decision with a bill attached (Vercel Blob or
              Cloudflare R2). Until it is made, addresses of pictures already in
              /public work, which covers the whole imported range.
            */}
            <p className="mt-4 rounded-xl bg-surface-sunken p-3 text-xs/5 text-muted">
              Uploading from your computer needs somewhere to store the files.
              Once that is chosen this becomes a drag-and-drop box.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
