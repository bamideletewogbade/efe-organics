import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/cart/AddToCart";
import { ProductCard } from "@/components/commerce/ProductCard";
import { ProductGallery } from "@/components/commerce/ProductGallery";
import { Container } from "@/components/layout/Container";
import { brand } from "@/lib/brand";
import {
  getCategory,
  getProduct,
  getVariants,
  listProducts,
  listShelf,
  sizeLabel,
} from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/money";
import {
  breadcrumbJsonLd,
  jsonLdScript,
  productJsonLd,
  productMetadata,
} from "@/lib/seo";

/** Every SKU is prerendered. 42 pages, and the data is static. */
export async function generateStaticParams() {
  const products = await listProducts({ includeWholesale: true });
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return productMetadata(product);
}

/**
 * Product detail.
 *
 * Two decisions worth stating:
 *
 * 1. **The size selector is links, not state.** Each size is a sibling SKU with
 *    its own slug, so switching size is a navigation. That keeps every size
 *    individually crawlable and shareable, works with JavaScript off, and means
 *    the price, photograph and ingredient list can never drift out of sync with
 *    the selected size, they are simply a different page.
 *
 * 2. **"Add to basket" is visibly not wired.** There is no checkout yet, and the
 *    prices are the reseller's rather than confirmed RRP. Rendering a working-
 *    looking button that silently does nothing is worse than saying so, so the
 *    control is disabled and labelled, with the real buying route beside it.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [variants, category] = await Promise.all([
    getVariants(product),
    Promise.resolve(getCategory(product.category)),
  ]);

  const related = (await listShelf({ category: product.category }))
    .filter((group) => group.lead.slug !== product.slug)
    .slice(0, 4);

  const saving = discountPercent(product.priceMinor, product.compareAtMinor);
  const currentSize = sizeLabel(product);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(category
      ? [{ name: category.name, path: `/collections/${category.slug}` }]
      : []),
    { name: product.name, path: `/shop/${product.slug}` },
  ];

  const detail = [
    { key: "ingredients", label: "Ingredients", body: product.ingredients },
    { key: "how-to-use", label: "How to use", body: product.howToUse },
  ].filter((section) => Boolean(section.body));

  return (
    <>
      <script {...jsonLdScript(productJsonLd(product, variants))} />
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <Container className="py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {trail.map((crumb, index) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {index < trail.length - 1 ? (
                  <>
                    <Link href={crumb.path} className="hover:text-accent">
                      {crumb.name}
                    </Link>
                    <span aria-hidden>/</span>
                  </>
                ) : (
                  <span aria-current="page" className="text-strong">
                    {crumb.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery
            images={product.images}
            name={product.name}
            badge={saving !== null ? `Save ${saving}%` : undefined}
          />

          {/* ---- buying panel ---- */}
          <div>
            {category && (
              <Link
                href={`/collections/${category.slug}`}
                className="eyebrow text-accent-quiet hover:underline"
              >
                {category.name}
              </Link>
            )}

            <h1 className="mt-3 text-3xl sm:text-4xl">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="stat text-3xl text-strong">
                {formatPrice(product.priceMinor)}
              </span>
              {product.compareAtMinor && (
                <span className="text-lg text-muted line-through">
                  {formatPrice(product.compareAtMinor)}
                </span>
              )}
              {saving !== null && (
                <span className="eyebrow rounded-full bg-saffron/12 px-2.5 py-1 text-[0.6rem] text-accent">
                  Save {saving}%
                </span>
              )}
            </div>

            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${
                  product.inStock ? "bg-saffron" : "bg-muted"
                }`}
              />
              {product.inStock ? "In stock" : "Currently unavailable"}
            </p>

            {product.blurb && (
              <p className="measure mt-6 text-base/7 text-body">
                {product.blurb}
              </p>
            )}

            {/* ---- size selector: sibling links ---- */}
            {variants.length > 1 && (
              <div className="mt-8">
                <p className="text-sm font-semibold text-strong">
                  Size
                  {currentSize && (
                    <span className="ml-2 font-normal text-muted">
                      {currentSize}
                    </span>
                  )}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const label = sizeLabel(variant) ?? "One size";
                    const current = variant.slug === product.slug;
                    return (
                      <li key={variant.slug}>
                        <Link
                          href={`/shop/${variant.slug}`}
                          aria-current={current ? "true" : undefined}
                          className={`block rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${
                            current
                              ? "border-accent bg-saffron/12 font-semibold text-strong"
                              : "border-line text-muted hover:border-accent/50 hover:text-strong"
                          }`}
                        >
                          {label}
                          <span className="ml-2 text-xs opacity-70">
                            {formatPrice(variant.priceMinor)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ---- buying ---- */}
            <div className="mt-8">
              <AddToCart slug={product.slug} disabled={!product.inStock} />
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
              {[
                "Delivery across Ghana",
                "Mobile money & card",
                "Handcrafted in Accra",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden
                    className="h-3.5 w-3.5 text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 8.5 3.2 3.2L13 5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            {/* ---- details ---- */}
            {detail.length > 0 && (
              <div className="mt-10 divide-y divide-line border-y border-line">
                {detail.map((section) => (
                  <details key={section.key} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-strong">
                      {section.label}
                      <span
                        aria-hidden
                        className="text-accent transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="measure mt-3 text-sm/7 text-muted">
                      {section.body}
                    </p>
                  </details>
                ))}
              </div>
            )}

            <p className="mt-6 text-xs/5 text-muted">
              Handcrafted in {brand.contact.city}, {brand.contact.country}.
            </p>
          </div>
        </div>
      </Container>

      {/* ---- related ---- */}
      {related.length > 0 && category && (
        <section className="border-t border-line bg-surface-sunken py-16">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl">More {category.name}</h2>
              <Link
                href={`/collections/${category.slug}`}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-accent"
              >
                See all
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((group, index) => (
                <ProductCard key={group.key} group={group} index={index} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
