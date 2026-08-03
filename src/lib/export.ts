import { desc, eq } from "drizzle-orm";

import { requireDb } from "@/db/client";
import {
  categories,
  customers,
  orderItems,
  orders,
  products,
  variants,
} from "@/db/schema";
import { toCsv, type Delimiter } from "@/lib/csv";

/**
 * Getting data back out.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 *
 * The whole pitch to Alberta is that she stops renting her shop and owns it. A
 * platform you cannot leave is not owned, it is just rented from somebody
 * friendlier. Being able to export everything, in a format another system can
 * read, is what makes that claim true rather than a slogan, and it is the single
 * most reassuring thing you can show a business being asked to migrate.
 *
 * It is also the honest answer to "what happens if this arrangement ends".
 *
 * FOUR EXPORTS, SHAPED FOR DIFFERENT JOBS
 *
 * - **orders**: one row per order, for accounting and reporting.
 * - **orderItems**: one row per LINE, because "what sold most" cannot be
 *   answered from order totals and every analytics tool wants the long form.
 * - **customers**: the mailing list, with an order count and lifetime value
 *   worked out, since that is what anyone actually wants it for.
 * - **catalogue**: products and variants flattened, in a shape close enough to
 *   Ecwid's own product import that it can be pasted back if she ever needs to.
 *
 * DATES ARE ISO, MONEY IS DECIMAL.
 *
 * Internally money is integer pesewas, which is right for arithmetic and wrong
 * for a spreadsheet: nobody wants to see 1500 for a GH₵15 bar. Exports convert
 * to two-decimal major units. Dates go out as ISO because it is the one format
 * that survives Excel, Google Sheets and a re-import without being reinterpreted
 * as an American date.
 */

const money = (minor: number | null | undefined): string =>
  minor === null || minor === undefined ? "" : (minor / 100).toFixed(2);

const iso = (date: Date | null | undefined): string =>
  date ? new Date(date).toISOString() : "";

export type ExportKind = "orders" | "order-items" | "customers" | "catalogue";

export const EXPORTS: Record<
  ExportKind,
  { label: string; blurb: string; filename: string }
> = {
  orders: {
    label: "Orders",
    blurb:
      "One row per order, with totals, delivery details and status. For accounts and reporting.",
    filename: "efe-orders",
  },
  "order-items": {
    label: "Order lines",
    blurb:
      "One row per product sold. Needed for anything that asks what sells, rather than how much sold.",
    filename: "efe-order-lines",
  },
  customers: {
    label: "Customers",
    blurb:
      "The mailing list, with each customer's order count and lifetime value.",
    filename: "efe-customers",
  },
  catalogue: {
    label: "Catalogue",
    blurb:
      "Every product and size with prices and stock. Close to Ecwid's product format, so it can be taken elsewhere.",
    filename: "efe-catalogue",
  },
};

export async function buildExport(
  kind: ExportKind,
  delimiter: Delimiter = ",",
): Promise<string> {
  const db = requireDb();

  if (kind === "orders") {
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.placedAt));

    return toCsv(
      rows.map((order) => ({
        reference: order.reference,
        legacyReference: order.legacyReference ?? "",
        placedAt: iso(order.placedAt),
        status: order.status,
        paymentStatus: order.paymentStatus,
        customerName: order.deliveryName ?? "",
        customerEmail: order.deliveryEmail ?? "",
        customerPhone: order.deliveryPhone ?? "",
        town: order.deliveryTown ?? "",
        region: order.deliveryRegion ?? "",
        address: order.deliveryAddress ?? "",
        subtotal: money(order.subtotalMinor),
        discount: money(order.discountMinor),
        delivery: money(order.deliveryMinor),
        tax: money(order.taxMinor),
        total: money(order.totalMinor),
        currency: order.currency,
        customerNote: order.customerNote ?? "",
        internalNote: order.internalNote ?? "",
      })),
      [
        { key: "reference", header: "Order number" },
        { key: "legacyReference", header: "Previous system reference" },
        { key: "placedAt", header: "Date placed" },
        { key: "status", header: "Status" },
        { key: "paymentStatus", header: "Payment status" },
        { key: "customerName", header: "Customer name" },
        { key: "customerEmail", header: "Customer email" },
        { key: "customerPhone", header: "Customer phone" },
        { key: "town", header: "Town" },
        { key: "region", header: "Region" },
        { key: "address", header: "Address" },
        { key: "subtotal", header: "Subtotal" },
        { key: "discount", header: "Discount" },
        { key: "delivery", header: "Delivery cost" },
        { key: "tax", header: "Tax" },
        { key: "total", header: "Order total" },
        { key: "currency", header: "Currency" },
        { key: "customerNote", header: "Customer note" },
        { key: "internalNote", header: "Internal note" },
      ],
      delimiter,
    );
  }

  if (kind === "order-items") {
    const rows = await db
      .select({
        reference: orders.reference,
        placedAt: orders.placedAt,
        status: orders.status,
        name: orderItems.nameSnapshot,
        size: orderItems.sizeSnapshot,
        slug: orderItems.slugSnapshot,
        quantity: orderItems.quantity,
        unitPriceMinor: orderItems.unitPriceMinor,
        lineTotalMinor: orderItems.lineTotalMinor,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .orderBy(desc(orders.placedAt));

    return toCsv(
      rows.map((row) => ({
        reference: row.reference,
        placedAt: iso(row.placedAt),
        status: row.status,
        name: row.name,
        size: row.size ?? "",
        slug: row.slug ?? "",
        quantity: String(row.quantity),
        unitPrice: money(row.unitPriceMinor),
        lineTotal: money(row.lineTotalMinor),
      })),
      [
        { key: "reference", header: "Order number" },
        { key: "placedAt", header: "Date placed" },
        { key: "status", header: "Status" },
        { key: "name", header: "Product" },
        { key: "size", header: "Size" },
        { key: "slug", header: "SKU" },
        { key: "quantity", header: "Quantity" },
        { key: "unitPrice", header: "Unit price" },
        { key: "lineTotal", header: "Line total" },
      ],
      delimiter,
    );
  }

  if (kind === "customers") {
    /*
      Order count and lifetime value are computed here rather than left to the
      recipient. A bare list of email addresses is a worse mailing list than one
      that says who has bought four times, and working that out in a spreadsheet
      afterwards is a pivot table nobody builds.
    */
    const rows = await db
      .select({
        id: customers.id,
        email: customers.email,
        name: customers.name,
        phone: customers.phone,
        acceptsMarketing: customers.acceptsMarketing,
        notes: customers.notes,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .orderBy(desc(customers.createdAt));

    const orderRows = await db
      .select({
        customerId: orders.customerId,
        totalMinor: orders.totalMinor,
        paymentStatus: orders.paymentStatus,
        placedAt: orders.placedAt,
      })
      .from(orders);

    const stats = new Map<
      string,
      { count: number; spentMinor: number; last: Date | null }
    >();
    for (const order of orderRows) {
      if (!order.customerId) continue;
      const entry = stats.get(order.customerId) ?? {
        count: 0,
        spentMinor: 0,
        last: null,
      };
      entry.count += 1;
      if (order.paymentStatus === "paid") entry.spentMinor += order.totalMinor;
      if (!entry.last || order.placedAt > entry.last) entry.last = order.placedAt;
      stats.set(order.customerId, entry);
    }

    return toCsv(
      rows.map((customer) => {
        const stat = stats.get(customer.id);
        return {
          email: customer.email,
          name: customer.name ?? "",
          phone: customer.phone ?? "",
          orders: String(stat?.count ?? 0),
          spent: money(stat?.spentMinor ?? 0),
          lastOrder: iso(stat?.last),
          acceptsMarketing: customer.acceptsMarketing ? "yes" : "no",
          notes: customer.notes ?? "",
          firstSeen: iso(customer.createdAt),
        };
      }),
      [
        { key: "email", header: "Email" },
        { key: "name", header: "Name" },
        { key: "phone", header: "Phone" },
        { key: "orders", header: "Orders" },
        { key: "spent", header: "Total spent" },
        { key: "lastOrder", header: "Last order" },
        { key: "acceptsMarketing", header: "Accepts marketing" },
        { key: "notes", header: "Notes" },
        { key: "firstSeen", header: "First seen" },
      ],
      delimiter,
    );
  }

  // catalogue
  const rows = await db
    .select({
      productName: products.name,
      productSlug: products.slug,
      status: products.status,
      line: products.line,
      blurb: products.blurb,
      ingredients: products.ingredients,
      categoryName: categories.name,
      variantSlug: variants.slug,
      sku: variants.sku,
      sizeLabel: variants.sizeLabel,
      priceMinor: variants.priceMinor,
      compareAtMinor: variants.compareAtMinor,
      costMinor: variants.costMinor,
      stockQty: variants.stockQty,
      trackStock: variants.trackStock,
      lowStockThreshold: variants.lowStockThreshold,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .orderBy(products.name, variants.priceMinor);

  return toCsv(
    rows.map((row) => ({
      productName: row.productName,
      sku: row.sku ?? row.variantSlug,
      sizeLabel: row.sizeLabel ?? "",
      price: money(row.priceMinor),
      compareAt: money(row.compareAtMinor),
      cost: money(row.costMinor),
      stock: row.trackStock ? String(row.stockQty) : "not tracked",
      lowStockThreshold: String(row.lowStockThreshold),
      category: row.categoryName ?? "",
      status: row.status,
      line: row.line,
      blurb: row.blurb ?? "",
      ingredients: row.ingredients ?? "",
      productSlug: row.productSlug,
      variantSlug: row.variantSlug,
    })),
    [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "sizeLabel", header: "Size" },
      { key: "price", header: "Price" },
      { key: "compareAt", header: "Was price" },
      { key: "cost", header: "Cost" },
      { key: "stock", header: "Stock" },
      { key: "lowStockThreshold", header: "Restock at" },
      { key: "category", header: "Category" },
      { key: "status", header: "Status" },
      { key: "line", header: "Range" },
      { key: "blurb", header: "Description" },
      { key: "ingredients", header: "Ingredients" },
      { key: "productSlug", header: "Product URL slug" },
      { key: "variantSlug", header: "Variant URL slug" },
    ],
    delimiter,
  );
}
