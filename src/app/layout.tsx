import type { Metadata } from "next";
import localFont from "next/font/local";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { brand } from "@/lib/brand";
import { listCategories, listProducts } from "@/lib/catalog";
import { env } from "@/lib/env";
import "./globals.css";

/**
 * Fonts are SELF-HOSTED, not pulled via `next/font/google`.
 *
 * That helper fetches from Google at build time and this environment cannot
 * reach it — every build failed on "Failed to fetch `Fraunces` from Google
 * Fonts". Self-hosting takes the network out of the build and is faster for
 * users. Refresh the files with `node scripts/fetch-fonts.mjs`.
 *
 * Display: Fraunces, standing in for the deck's Recoleta (not yet licensed).
 * Both are variable, so one file each covers every weight.
 */
const bricolage = localFont({
  src: "./fonts/bricolage-variable.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

/** UI, stats and labels. Geometric, and heavy enough to carry a number. */
const figtree = localFont({
  src: "./fonts/figtree-variable.woff2",
  variable: "--font-figtree",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.public.siteUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    url: brand.url,
    siteName: brand.name,
    locale: "en_GH",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Category counts feed the header's mega-menu. Fetched once in the layout so
  // the header stays a presentational client component with no data access.
  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ includeWholesale: true }),
  ]);

  const catalogue = Object.fromEntries(
    products.map((product) => [product.slug, product]),
  );

  return (
    <html
      lang="en-GH"
      className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}
    >
      {/*
        Blocking theme script. Must run BEFORE first paint, otherwise the page
        renders in light and repaints to dark — the classic flash. It is inline
        and synchronous for that reason, and it is the only inline script on the
        site. Kept to a single expression so there is nothing to get wrong.
      */}
      <script
        dangerouslySetInnerHTML={{
          // Light unless the viewer has explicitly chosen dark. The OS
          // preference is deliberately NOT consulted — see globals.css.
          __html: `(function(){try{document.documentElement.dataset.theme=localStorage.getItem("efe-theme")==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`,
        }}
      />
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-forest focus:px-5 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {/*
          The whole catalogue is handed to the cart once, here, so the drawer can
          resolve names, prices and imagery with no fetch and no loading state.
          42 SKUs is a few KB — see CartProvider for why this is only reasonable
          at this catalogue size.
        */}
        <CartProvider catalogue={catalogue}>
          <SiteHeader
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              count: c.count,
            }))}
          />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <CartDrawer />
          <AnalyticsProvider />
        </CartProvider>
      </body>
    </html>
  );
}
