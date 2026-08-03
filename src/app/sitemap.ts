import type { MetadataRoute } from "next";

import { CATEGORIES, listProducts } from "@/lib/catalog";
import { absolute } from "@/lib/seo";

/**
 * Sitemap.
 *
 * Priorities reflect what we actually want ranked: collections are the pages
 * that match how people search ("african black soap ghana"), so they sit above
 * individual SKUs. `/shop` is included but the filtered `?category=` views are
 * not. They canonicalise to the collection pages instead of competing with them.
 *
 * The bulk trade SKU is included: it is a real, linked page on /partners and a
 * formulator searching for raw black soap should be able to find it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts({ includeWholesale: true });
  const now = new Date();

  return [
    { url: absolute("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absolute("/shop"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absolute("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absolute("/partners"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absolute("/stockists"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absolute("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },

    ...CATEGORIES.map((category) => ({
      url: absolute(`/collections/${category.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),

    ...products.map((product) => ({
      url: absolute(`/shop/${product.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
