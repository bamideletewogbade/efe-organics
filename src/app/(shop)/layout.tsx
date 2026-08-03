import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { listCategories, listProducts } from "@/lib/catalog";
import { getShopSettings } from "@/lib/settings";

/**
 * Storefront chrome.
 *
 * WHY THIS EXISTS. All of this used to live in the ROOT layout, which meant it
 * wrapped every route. So `/admin` rendered the shop header, the shop footer
 * and a cart drawer on top of the admin's own navigation. A back office with a
 * "Shop / Our story / Wholesale" bar and a basket icon is not a back office.
 *
 * ARCHITECTURE.md §2 specified this split from the start; it simply had not been
 * materialised yet. Now the root layout owns only the document. Fonts, theme,
 * `<body>`. And each route group brings its own chrome:
 *
 *   (shop)  → header, footer, cart, analytics   ← this file
 *   admin   → sidebar only, no cart, no tracking
 *
 * The catalogue is fetched ONCE here and handed to the cart, so the drawer can
 * resolve names, prices and images with no fetch and no loading state. It also
 * means the admin no longer pays for a catalogue payload it never uses.
 */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, products, settings] = await Promise.all([
    listCategories(),
    listProducts({ includeWholesale: true }),
    getShopSettings(),
  ]);

  const catalogue = Object.fromEntries(
    products.map((product) => [product.slug, product]),
  );

  return (
    <CartProvider catalogue={catalogue}>
      <AnnouncementBar announcement={settings.announcement} />
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
  );
}
