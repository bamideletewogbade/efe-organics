import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/commerce/ProductCard";
import { Container } from "@/components/layout/Container";
import { CATEGORIES, getCategory, listShelf } from "@/lib/catalog";
import {
  breadcrumbJsonLd,
  collectionJsonLd,
  jsonLdScript,
  pageMetadata,
} from "@/lib/seo";

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Range not found" };

  return pageMetadata({
    title: category.name,
    description: category.blurb,
    path: `/collections/${category.slug}`,
  });
}

/**
 * A single range.
 *
 * This renders the same grid as `/shop?category=…`, which risks the two URLs
 * competing for the same query. `pageMetadata` sets the canonical to the
 * collection URL, so this is the indexed one and the filtered shop view defers
 * to it — collections are the pages worth ranking, because they match how people
 * search ("african black soap ghana"), and they are statically rendered.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const groups = await listShelf({ category: category.slug });

  const trail = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: category.name, path: `/collections/${category.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScript(collectionJsonLd(category, groups.length))} />
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <section className="on-dark under-header bg-forest-deep">
        <Container className="py-14 lg:py-16">
          <nav aria-label="Breadcrumb" className="text-xs text-paper/50">
            <Link href="/shop" className="hover:text-accent">
              Shop
            </Link>
            <span aria-hidden> / </span>
            <span className="text-paper/80">{category.name}</span>
          </nav>

          <h1 className="mt-4 text-4xl sm:text-5xl">{category.name}</h1>
          <p className="measure mt-4 text-paper/70">{category.blurb}</p>
          <p className="mt-4 text-sm text-paper/50">
            {groups.length} {groups.length === 1 ? "product" : "products"}
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((group, index) => (
              <ProductCard key={group.key} group={group} index={index} />
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-2 border-t border-line pt-8">
            <span className="w-full text-sm text-muted">Other ranges</span>
            {CATEGORIES.filter((c) => c.slug !== category.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/collections/${other.slug}`}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent/50 hover:text-strong"
              >
                {other.name}
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
