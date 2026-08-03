/**
 * Metadata and JSON-LD builders.
 *
 * One module so every page describes itself the same way, and so the structured
 * data stays consistent with what is actually on the page, mismatched JSON-LD
 * is worse than none, because it gets the site penalised rather than ignored.
 *
 * IMPORTANT. No `Offer` availability is claimed as purchasable yet. There is no
 * checkout, and the prices are the reseller's rather than confirmed RRP
 * (docs/OPEN-QUESTIONS.md #1). Products are published with
 * `availability: InStoreOnly` and a `seller` pointing at the confirmed retail
 * channel, which is the honest description of how someone actually buys today.
 * Flip to `InStock` + a real `url` when Phase 2 checkout ships AND prices are
 * confirmed, not before.
 */

import type { Metadata } from "next";

import { brand } from "./brand";
import type { Category, Product } from "./catalog";
import { CURRENCY } from "./money";
import { env } from "./env";

const SITE = env.public.siteUrl;

export function absolute(path: string): string {
  return new URL(path, SITE).toString();
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                    */
/* -------------------------------------------------------------------------- */

export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = absolute(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · ${brand.name}`,
      description,
      url,
      siteName: brand.name,
      locale: "en_GH",
      type: "website",
      ...(image ? { images: [{ url: absolute(image) }] } : {}),
    },
  };
}

export function productMetadata(product: Product): Metadata {
  const description =
    product.blurb ??
    `${product.name} from ${brand.name}. ${brand.description}`;

  return {
    ...pageMetadata({
      title: product.name,
      description,
      path: `/shop/${product.slug}`,
      image: product.images[0],
    }),
    openGraph: {
      title: `${product.name} · ${brand.name}`,
      description,
      url: absolute(`/shop/${product.slug}`),
      siteName: brand.name,
      locale: "en_GH",
      // `product` is the correct OG type here, not `website`.
      type: "website",
      ...(product.images[0]
        ? { images: [{ url: absolute(product.images[0]) }] }
        : {}),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                     */
/* -------------------------------------------------------------------------- */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.legalName,
    alternateName: brand.name,
    url: SITE,
    logo: absolute("/brand/mark-on-light.png"),
    slogan: brand.tagline,
    description: brand.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: brand.contact.city,
      addressCountry: "GH",
    },
    email: brand.contact.email,
    sameAs: [brand.social.instagram, brand.social.facebook, brand.social.tiktok],
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/**
 * schema.org Product.
 *
 * `offers` deliberately describes in-store availability through the confirmed
 * retailer rather than a direct purchase. See the note at the top of this file.
 * No `aggregateRating`: there are no reviews, and inventing them is exactly the
 * kind of thing that gets structured data flagged as spam.
 */
export function productJsonLd(product: Product, siblings: Product[] = []) {
  const sizes = siblings.length > 1 ? siblings : [product];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.blurb ?? product.ingredients ?? product.name,
    sku: product.slug,
    brand: { "@type": "Brand", name: brand.name },
    ...(product.images.length
      ? { image: product.images.map((src) => absolute(src)) }
      : {}),
    ...(product.ingredients
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            name: "Ingredients",
            value: product.ingredients,
          },
        }
      : {}),
    offers: sizes.map((variant) => ({
      "@type": "Offer",
      url: absolute(`/shop/${variant.slug}`),
      priceCurrency: CURRENCY,
      price: (variant.priceMinor / 100).toFixed(2),
      availability: variant.inStock
        ? "https://schema.org/InStoreOnly"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: brand.name },
    })),
  };
}

export function collectionJsonLd(category: Category, count: number) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.blurb,
    url: absolute(`/collections/${category.slug}`),
    isPartOf: { "@type": "WebSite", name: brand.name, url: SITE },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count,
    },
  };
}

/** Renders a JSON-LD block. Use in a server component. */
export function jsonLdScript(data: unknown) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  } as const;
}
