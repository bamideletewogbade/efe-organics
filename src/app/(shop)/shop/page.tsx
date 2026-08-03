import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/commerce/ProductCard";
import { ShopToolbar } from "@/components/commerce/ShopToolbar";
import { Container } from "@/components/layout/Container";
import { PageHero } from "@/components/layout/PageHero";
import { brand } from "@/lib/brand";
import { getCategory, listCategories, listShelf, listWholesale } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { parseCategory, parseSort, sortShelf } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Shop",
  description: `Every ${brand.name} product. African Black Soap, herbal hair care, body care, lotions and oils. Made in ${brand.contact.city}.`,
};

/**
 * The catalogue.
 *
 * Grouped by size family, so 41 SKUs present as 28 decisions. Filter and sort
 * live in the URL (see lib/shop.ts) rather than client state, every view is
 * shareable and crawlable, and the page renders correctly before hydration.
 *
 * The bulk trade SKU is excluded from the grid and surfaced in its own band at
 * the foot of the page. A quarter-tonne of soap crumble at GH₵13,750 alongside a
 * GH₵15 bar would misprice the whole shop in a shopper's head.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const sort = parseSort(params.sort);

  const [shelf, categories, wholesale] = await Promise.all([
    listShelf(category ? { category } : undefined),
    listCategories(),
    listWholesale(),
  ]);

  const groups = sortShelf(shelf, sort);
  const active = category ? getCategory(category) : null;

  return (
    <>
      {/* Header band. Dark so it reads as a deliberate page opener rather than
          a grid that starts abruptly under the nav. */}
      <PageHero
        crumbs={[{ name: "Home", href: "/" }]}
        title={active ? active.name : "The full range"}
        intro={
          active
            ? active.blurb
            : "Handcrafted in Accra from African Black Soap and herbal botanicals. Choose a size. Most products come in a trial format and a one-litre refill."
        }
      />

      <section className="py-10 lg:py-12">
        <Container>
          <ShopToolbar
            categories={categories}
            activeCategory={category}
            activeSort={sort}
            total={groups.length}
          />

          {groups.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {groups.map((group, index) => (
                <ProductCard key={group.key} group={group} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center">
              <p className="text-lg text-strong">Nothing in this range yet.</p>
              <p className="mt-2 text-sm text-muted">
                Try another range, or browse everything.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block rounded-full bg-saffron-light px-6 py-3 text-sm font-semibold text-forest-deep"
              >
                Show all products
              </Link>
            </div>
          )}
        </Container>
      </section>

      {/* Trade band ------------------------------------------------------- */}
      {wholesale.length > 0 && (
        <section className="border-t border-line bg-surface-sunken py-16">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <p className="eyebrow text-accent-quiet">Trade & wholesale</p>
                <h2 className="mt-3 text-2xl sm:text-3xl">
                  Buying to resell, or to formulate?
                </h2>
                <p className="measure mt-3 text-muted">
                  Beyond the retail range we supply one-litre professional
                  formats to salons and spas, and raw African Black Soap by the
                  quarter-tonne to formulators and wholesalers.
                </p>
                <Link
                  href="/partners"
                  className="group mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper"
                >
                  Sell Efe Organics
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              </div>

              <ul className="grid gap-3">
                {wholesale.map((product) => (
                  <li
                    key={product.slug}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-raised p-5"
                  >
                    <div>
                      <p className="font-semibold text-strong">{product.name}</p>
                      {product.blurb && (
                        <p className="mt-1 text-xs/5 text-muted">
                          {product.blurb}
                        </p>
                      )}
                    </div>
                    <p className="stat shrink-0 text-lg text-strong">
                      {formatPrice(product.priceMinor)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
