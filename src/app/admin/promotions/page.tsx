import { desc } from "drizzle-orm";

import { getDb } from "@/db/client";
import { bundles, discounts } from "@/db/schema";
import {
  createBundleAction,
  createDiscountAction,
  toggleDiscountAction,
} from "@/app/admin/actions";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotions" };

/**
 * Promotions.
 *
 * Discounts and bundles are presented as two different things because they are:
 * a **discount** is a rule applied to a basket ("20% off black soap"), a
 * **bundle** is a product a customer buys ("Starter Set"). Merging them into one
 * "offers" screen is the usual shortcut and it makes both confusing to set up.
 */
export default async function AdminPromotionsPage() {
  const db = getDb();
  const [discountRows, bundleRows] = db
    ? await Promise.all([
        db.select().from(discounts).orderBy(desc(discounts.createdAt)).limit(50),
        db.select().from(bundles).orderBy(desc(bundles.createdAt)).limit(50),
      ])
    : [[], []];

  const field =
    "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-2xl">Promotions</h1>
      <p className="mt-2 text-sm text-muted">
        Discounts are rules on a basket. Bundles are sets a customer buys.
      </p>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {/* ---- discounts ---- */}
        <section>
          <h2 className="text-lg">Discounts</h2>

          <form
            action={createDiscountAction}
            className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface-sunken p-5 sm:grid-cols-2"
          >
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Name
              </span>
              <input
                name="name"
                required
                placeholder="Harmattan 20% off"
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Type
              </span>
              <select name="kind" className={field} defaultValue="percentage">
                <option value="percentage">Percentage off</option>
                <option value="fixed_amount">Amount off (GH₵)</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Value
              </span>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="20"
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Applies to
              </span>
              <select name="scope" className={field} defaultValue="order">
                <option value="order">Whole basket</option>
                <option value="product">One product</option>
                <option value="variant">One size</option>
                <option value="category">A range</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Code <span className="font-normal text-muted">(optional)</span>
              </span>
              <input name="code" placeholder="HARMATTAN" className={field} />
            </label>

            <p className="text-xs/5 text-muted sm:col-span-2">
              Leave the code empty for an automatic discount that applies
              without the customer doing anything.
            </p>

            <button
              type="submit"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper sm:col-span-2 sm:justify-self-start"
            >
              Create discount
            </button>
          </form>

          <ul className="mt-4 grid gap-2">
            {discountRows.length === 0 && (
              <li className="rounded-xl border border-line bg-surface-raised p-4 text-sm text-muted">
                No discounts yet.
              </li>
            )}
            {discountRows.map((discount) => (
              <li
                key={discount.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-raised p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-strong">{discount.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {discount.kind === "percentage"
                      ? `${discount.value}% off`
                      : `${formatPrice(discount.value)} off`}{" "}
                    · {discount.scope}
                    {discount.code && ` · code ${discount.code}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    discount.active
                      ? "bg-saffron/15 text-accent"
                      : "bg-surface-sunken text-muted"
                  }`}
                >
                  {discount.active ? "Live" : "Off"}
                </span>
                <form action={toggleDiscountAction}>
                  <input type="hidden" name="discountId" value={discount.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(!discount.active)}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-strong"
                  >
                    {discount.active ? "Turn off" : "Turn on"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- bundles ---- */}
        <section>
          <h2 className="text-lg">Bundles</h2>

          <form
            action={createBundleAction}
            className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface-sunken p-5 sm:grid-cols-2"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Name
              </span>
              <input
                name="name"
                required
                placeholder="Black Soap Starter Set"
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                URL slug
              </span>
              <input
                name="slug"
                required
                placeholder="black-soap-starter-set"
                className={field}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Short description
              </span>
              <input
                name="blurb"
                placeholder="Everything to start with African Black Soap"
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Discount %
              </span>
              <input
                name="discountPercent"
                type="number"
                min="0"
                max="100"
                placeholder="15"
                className={field}
              />
            </label>

            <p className="self-end text-xs/5 text-muted">
              Products get added to the bundle after it is created.
            </p>

            <button
              type="submit"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper sm:col-span-2 sm:justify-self-start"
            >
              Create bundle
            </button>
          </form>

          <ul className="mt-4 grid gap-2">
            {bundleRows.length === 0 && (
              <li className="rounded-xl border border-line bg-surface-raised p-4 text-sm text-muted">
                No bundles yet.
              </li>
            )}
            {bundleRows.map((bundle) => (
              <li
                key={bundle.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-strong">{bundle.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    /{bundle.slug}
                    {bundle.discountPercent
                      ? ` · ${bundle.discountPercent}% off the set`
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    bundle.active
                      ? "bg-saffron/15 text-accent"
                      : "bg-surface-sunken text-muted"
                  }`}
                >
                  {bundle.active ? "Live" : "Off"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
