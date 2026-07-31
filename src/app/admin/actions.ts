"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { getDb, requireDb } from "@/db/client";
import {
  auditLog,
  bundles,
  discounts,
  orders,
  products,
  stockLedger,
  variants,
} from "@/db/schema";
import { getAdminSession, signIn, signOut } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";

/**
 * Admin mutations.
 *
 * THREE RULES EVERY ACTION FOLLOWS
 *
 * 1. **Re-check the session.** A server action is a public HTTP endpoint. The
 *    layout guard protects the *page*, not the action — anyone can POST to an
 *    action id directly, so the check has to be here too. This is the single
 *    most commonly missed thing in App Router apps.
 *
 * 2. **Write an audit row.** Every change records who, what and the before/after.
 *    Without it, "the price is wrong and nobody knows why" is unanswerable.
 *
 * 3. **Stock changes go through the ledger.** Never a bare UPDATE on `stockQty`.
 *    The quantity is a cache of the ledger's sum; writing one without the other
 *    is how inventory silently drifts from reality.
 */

const log = logger.child({ module: "admin-actions" });

async function assertAdmin() {
  const session = await getAdminSession();
  if (!session.authenticated) throw new Error("Not authorised");
  return session;
}

async function audit(
  action: string,
  entity: string,
  entityId: string,
  changes?: Record<string, unknown>,
) {
  const db = getDb();
  if (!db) return;
  await db.insert(auditLog).values({
    action,
    entity,
    entityId,
    actorEmail: "admin", // becomes the Clerk identity when auth lands
    changes: changes ?? null,
  });
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const ok = await signIn(password);
  if (!ok) {
    log.warn("admin sign-in rejected");
    return { error: "That password is not right." };
  }
  revalidatePath("/admin");
  return {};
}

export async function signOutAction() {
  await signOut();
  revalidatePath("/admin");
}

/* -------------------------------------------------------------------------- */
/* Stock                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Adjusts stock by a delta and records why.
 *
 * Delta rather than absolute so two people editing at once cannot clobber each
 * other: "+10 restock" and "-2 damage" compose correctly, whereas two absolute
 * writes mean the last one wins and the other simply vanishes.
 */
export async function adjustStockAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const variantId = String(formData.get("variantId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const reason =
    (String(formData.get("reason") ?? "manual_adjustment") as
      | "manual_adjustment"
      | "restock"
      | "damage"
      | "return") ?? "manual_adjustment";
  const note = String(formData.get("note") ?? "") || null;

  if (!variantId || !Number.isFinite(delta) || delta === 0) return;

  await db.transaction(async (tx) => {
    await tx.insert(stockLedger).values({ variantId, delta, reason, note });
    await tx
      .update(variants)
      .set({
        // `greatest(...,0)` so a bad adjustment cannot leave negative stock,
        // which would read as "in stock" in any naive comparison downstream.
        stockQty: sql`greatest(${variants.stockQty} + ${delta}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(variants.id, variantId));
  });

  await audit("stock.adjust", "variant", variantId, { delta, reason, note });
  log.info("stock adjusted", { variantId, delta, reason });
  revalidatePath("/admin/stock");
  revalidatePath("/admin");
}

export async function setStockSettingsAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const variantId = String(formData.get("variantId") ?? "");
  const trackStock = formData.get("trackStock") === "on";
  const lowStockThreshold = Number(formData.get("lowStockThreshold") ?? 5);
  if (!variantId) return;

  await db
    .update(variants)
    .set({
      trackStock,
      lowStockThreshold: Math.max(0, lowStockThreshold),
      updatedAt: new Date(),
    })
    .where(eq(variants.id, variantId));

  await audit("stock.settings", "variant", variantId, {
    trackStock,
    lowStockThreshold,
  });
  revalidatePath("/admin/stock");
}

/* -------------------------------------------------------------------------- */
/* Products & pricing                                                         */
/* -------------------------------------------------------------------------- */

export async function setProductStatusAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const productId = String(formData.get("productId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "draft"
    | "active"
    | "archived";
  if (!productId || !["draft", "active", "archived"].includes(status)) return;

  await db
    .update(products)
    .set({
      status,
      archivedAt: status === "archived" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  await audit("product.status", "product", productId, { status });
  revalidatePath("/admin/products");
}

export async function setVariantPriceAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const variantId = String(formData.get("variantId") ?? "");
  // Input is in cedis for the human; stored as pesewas.
  const priceMajor = Number(formData.get("price") ?? NaN);
  const compareMajor = Number(formData.get("compareAt") ?? NaN);
  if (!variantId || !Number.isFinite(priceMajor) || priceMajor < 0) return;

  await db
    .update(variants)
    .set({
      priceMinor: Math.round(priceMajor * 100),
      compareAtMinor:
        Number.isFinite(compareMajor) && compareMajor > priceMajor
          ? Math.round(compareMajor * 100)
          : null,
      updatedAt: new Date(),
    })
    .where(eq(variants.id, variantId));

  await audit("variant.price", "variant", variantId, {
    priceMinor: Math.round(priceMajor * 100),
  });
  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
}

/* -------------------------------------------------------------------------- */
/* Promotions                                                                 */
/* -------------------------------------------------------------------------- */

export async function createDiscountAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "percentage") as
    | "percentage"
    | "fixed_amount";
  const scope = String(formData.get("scope") ?? "order") as
    | "order"
    | "product"
    | "variant"
    | "category";
  const rawValue = Number(formData.get("value") ?? 0);
  const code = String(formData.get("code") ?? "").trim().toUpperCase() || null;
  if (!name || !Number.isFinite(rawValue) || rawValue <= 0) return;

  // Percentage is a whole number 1–100; fixed amount arrives in cedis.
  const value =
    kind === "percentage"
      ? Math.min(100, Math.round(rawValue))
      : Math.round(rawValue * 100);

  const [row] = await db
    .insert(discounts)
    .values({ name, kind, scope, value, code, active: true })
    .returning({ id: discounts.id });

  await audit("discount.create", "discount", row.id, { name, kind, value });
  log.info("discount created", { id: row.id, name });
  revalidatePath("/admin/promotions");
}

export async function toggleDiscountAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();
  const id = String(formData.get("discountId") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await db
    .update(discounts)
    .set({ active, updatedAt: new Date() })
    .where(eq(discounts.id, id));
  await audit("discount.toggle", "discount", id, { active });
  revalidatePath("/admin/promotions");
}

export async function createBundleAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const discountPercent = Number(formData.get("discountPercent") ?? 0);
  const blurb = String(formData.get("blurb") ?? "").trim() || null;
  if (!name || !slug) return;

  const [row] = await db
    .insert(bundles)
    .values({
      name,
      slug,
      blurb,
      discountPercent: Number.isFinite(discountPercent)
        ? Math.min(100, Math.max(0, Math.round(discountPercent)))
        : null,
      active: true,
    })
    .returning({ id: bundles.id });

  await audit("bundle.create", "bundle", row.id, { name, slug });
  revalidatePath("/admin/promotions");
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

export async function setOrderStatusAction(formData: FormData) {
  await assertAdmin();
  const db = requireDb();

  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "pending"
    | "confirmed"
    | "paid"
    | "packed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  if (!orderId || !status) return;

  await db
    .update(orders)
    .set({
      status,
      // Marking an order paid is the one status that also settles payment —
      // otherwise the two fields drift and revenue reporting is wrong.
      ...(status === "paid" ? { paymentStatus: "paid" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await audit("order.status", "order", orderId, { status });
  log.info("order status changed", { orderId, status });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}
