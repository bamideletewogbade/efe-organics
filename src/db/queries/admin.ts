import { and, count, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  auditLog,
  bundles,
  categories,
  discounts,
  events,
  orderItems,
  orders,
  productImages,
  products,
  stockLedger,
  variants,
} from "@/db/schema";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-queries" });

/**
 * Admin data access.
 *
 * Every function returns a safe empty value when there is no database, rather
 * than throwing. The admin then renders a "not configured" state instead of a
 * 500 — which is the difference between a deployment you can diagnose and one
 * that just looks broken.
 *
 * Reads are joined and aggregated in SQL, not in JavaScript. An admin list that
 * fetches all products then counts variants per product in a loop is the
 * classic N+1 that makes a dashboard feel slow at exactly the moment the
 * catalogue grows.
 */

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "active" | "archived";
  line: "flagship" | "supporting";
  categoryName: string | null;
  variantCount: number;
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
  totalStock: number;
  /** Variants at or below their own low-stock threshold. */
  lowStockCount: number;
  outOfStockCount: number;
  imageUrl: string | null;
};

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  const db = getDb();
  if (!db) return [];

  return log.time("listAdminProducts", async () => {
    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        status: products.status,
        line: products.line,
        categoryName: categories.name,
        variantCount: count(variants.id),
        minPriceMinor: sql<number>`min(${variants.priceMinor})`,
        maxPriceMinor: sql<number>`max(${variants.priceMinor})`,
        totalStock: sql<number>`coalesce(sum(case when ${variants.trackStock} then ${variants.stockQty} else 0 end), 0)`,
        lowStockCount: sql<number>`count(*) filter (where ${variants.trackStock} and ${variants.stockQty} > 0 and ${variants.stockQty} <= ${variants.lowStockThreshold})`,
        outOfStockCount: sql<number>`count(*) filter (where ${variants.trackStock} and ${variants.stockQty} <= 0)`,
        imageUrl: sql<string | null>`min(${productImages.url})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(
        variants,
        and(eq(variants.productId, products.id), isNull(variants.archivedAt)),
      )
      .leftJoin(productImages, eq(productImages.productId, products.id))
      .where(isNull(products.archivedAt))
      .groupBy(products.id, categories.name)
      .orderBy(products.position, products.name);

    return rows as AdminProductRow[];
  });
}

export type AdminVariantRow = {
  id: string;
  slug: string;
  sizeLabel: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  stockQty: number;
  lowStockThreshold: number;
  trackStock: boolean;
  channel: "retail" | "trade" | "both";
  productName: string;
  productSlug: string;
};

/** The stock screen: every sellable unit, most urgent first. */
export async function listAdminVariants(): Promise<AdminVariantRow[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: variants.id,
      slug: variants.slug,
      sizeLabel: variants.sizeLabel,
      priceMinor: variants.priceMinor,
      compareAtMinor: variants.compareAtMinor,
      stockQty: variants.stockQty,
      lowStockThreshold: variants.lowStockThreshold,
      trackStock: variants.trackStock,
      channel: variants.channel,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .where(and(isNull(variants.archivedAt), isNull(products.archivedAt)))
    // Out of stock first, then low, then the rest — the admin's actual priority.
    .orderBy(
      sql`case
        when ${variants.trackStock} and ${variants.stockQty} <= 0 then 0
        when ${variants.trackStock} and ${variants.stockQty} <= ${variants.lowStockThreshold} then 1
        else 2 end`,
      products.name,
      variants.position,
    );

  return rows as AdminVariantRow[];
}

export type AdminOrderRow = {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  totalMinor: number;
  itemCount: number;
  customerName: string | null;
  town: string | null;
  placedAt: Date;
};

export async function listAdminOrders(limit = 100): Promise<AdminOrderRow[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      totalMinor: orders.totalMinor,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      customerName: orders.deliveryName,
      town: orders.deliveryTown,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .groupBy(orders.id)
    .orderBy(desc(orders.placedAt))
    .limit(limit);

  return rows as AdminOrderRow[];
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export type DashboardSummary = {
  configured: boolean;
  productCount: number;
  variantCount: number;
  lowStock: number;
  outOfStock: number;
  ordersToday: number;
  ordersWeek: number;
  revenueWeekMinor: number;
  pendingOrders: number;
  activeDiscounts: number;
  activeBundles: number;
  sessionsWeek: number;
  addToCartWeek: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = getDb();
  const empty: DashboardSummary = {
    configured: false,
    productCount: 0,
    variantCount: 0,
    lowStock: 0,
    outOfStock: 0,
    ordersToday: 0,
    ordersWeek: 0,
    revenueWeekMinor: 0,
    pendingOrders: 0,
    activeDiscounts: 0,
    activeBundles: 0,
    sessionsWeek: 0,
    addToCartWeek: 0,
  };
  if (!db) return empty;

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return log.time("getDashboardSummary", async () => {
    const [
      productAgg,
      variantAgg,
      orderAgg,
      pendingAgg,
      discountAgg,
      bundleAgg,
      sessionAgg,
      cartAgg,
    ] = await Promise.all([
      db
        .select({ n: count() })
        .from(products)
        .where(isNull(products.archivedAt)),
      db
        .select({
          n: count(),
          low: sql<number>`count(*) filter (where ${variants.trackStock} and ${variants.stockQty} > 0 and ${variants.stockQty} <= ${variants.lowStockThreshold})`,
          out: sql<number>`count(*) filter (where ${variants.trackStock} and ${variants.stockQty} <= 0)`,
        })
        .from(variants)
        .where(isNull(variants.archivedAt)),
      db
        .select({
          today: sql<number>`count(*) filter (where ${orders.placedAt} >= ${dayAgo})`,
          week: sql<number>`count(*) filter (where ${orders.placedAt} >= ${weekAgo})`,
          // Revenue counts only orders that were actually paid.
          revenue: sql<number>`coalesce(sum(${orders.totalMinor}) filter (where ${orders.placedAt} >= ${weekAgo} and ${orders.paymentStatus} = 'paid'), 0)`,
        })
        .from(orders),
      db
        .select({ n: count() })
        .from(orders)
        .where(eq(orders.status, "pending")),
      db
        .select({ n: count() })
        .from(discounts)
        .where(
          and(
            eq(discounts.active, true),
            or(isNull(discounts.endsAt), gte(discounts.endsAt, now)),
            or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
          ),
        ),
      db.select({ n: count() }).from(bundles).where(eq(bundles.active, true)),
      db
        .select({ n: sql<number>`count(distinct ${events.sessionId})` })
        .from(events)
        .where(gte(events.occurredAt, weekAgo)),
      db
        .select({ n: count() })
        .from(events)
        .where(
          and(eq(events.name, "add_to_cart"), gte(events.occurredAt, weekAgo)),
        ),
    ]);

    return {
      configured: true,
      productCount: Number(productAgg[0]?.n ?? 0),
      variantCount: Number(variantAgg[0]?.n ?? 0),
      lowStock: Number(variantAgg[0]?.low ?? 0),
      outOfStock: Number(variantAgg[0]?.out ?? 0),
      ordersToday: Number(orderAgg[0]?.today ?? 0),
      ordersWeek: Number(orderAgg[0]?.week ?? 0),
      revenueWeekMinor: Number(orderAgg[0]?.revenue ?? 0),
      pendingOrders: Number(pendingAgg[0]?.n ?? 0),
      activeDiscounts: Number(discountAgg[0]?.n ?? 0),
      activeBundles: Number(bundleAgg[0]?.n ?? 0),
      sessionsWeek: Number(sessionAgg[0]?.n ?? 0),
      addToCartWeek: Number(cartAgg[0]?.n ?? 0),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export type FunnelStep = { name: string; label: string; sessions: number };

/**
 * Sessions that reached each step, not raw event counts.
 *
 * Counting events would let one indecisive shopper adding the same bar five
 * times look like five people, which makes every downstream rate meaningless.
 */
export async function getFunnel(days = 7): Promise<FunnelStep[]> {
  const db = getDb();
  if (!db) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const steps: Array<[string, string]> = [
    ["page_view", "Visited"],
    ["product_view", "Viewed a product"],
    ["add_to_cart", "Added to basket"],
    ["begin_checkout", "Started checkout"],
    ["order_placed", "Ordered"],
  ];

  const rows = await db
    .select({
      name: events.name,
      sessions: sql<number>`count(distinct ${events.sessionId})`,
    })
    .from(events)
    .where(gte(events.occurredAt, since))
    .groupBy(events.name);

  const bySession = new Map(rows.map((r) => [r.name, Number(r.sessions)]));
  return steps.map(([name, label]) => ({
    name,
    label,
    sessions: bySession.get(name) ?? 0,
  }));
}

export type TopProduct = { slug: string; name: string; views: number };

export async function getTopProducts(days = 7, limit = 8): Promise<TopProduct[]> {
  const db = getDb();
  if (!db) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      slug: sql<string>`${events.props}->>'slug'`,
      name: sql<string>`coalesce(${events.props}->>'name', ${events.props}->>'slug')`,
      views: count(),
    })
    .from(events)
    .where(
      and(
        eq(events.name, "product_view"),
        gte(events.occurredAt, since),
        sql`${events.props}->>'slug' is not null`,
      ),
    )
    .groupBy(sql`${events.props}->>'slug'`, sql`${events.props}->>'name'`)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({ ...r, views: Number(r.views) }));
}

export async function getRecentAudit(limit = 20) {
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function getStockHistory(variantId: string, limit = 30) {
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(stockLedger)
    .where(eq(stockLedger.variantId, variantId))
    .orderBy(desc(stockLedger.createdAt))
    .limit(limit);
}
