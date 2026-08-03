import type { MetadataRoute } from "next";

import { absolute } from "@/lib/seo";

/**
 * robots.txt
 *
 * `/shop` filter and sort permutations are disallowed. They are useful to a
 * visitor but they are duplicate content to a crawler, every one of them shows
 * a subset already covered by a `/collections/…` page, which is the canonical
 * home for that query. Blocking them concentrates ranking rather than splitting
 * it across dozens of near-identical URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/shop?", "/api/"],
      },
    ],
    sitemap: absolute("/sitemap.xml"),
    host: absolute("/"),
  };
}
