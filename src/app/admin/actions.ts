"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, ne, sql } from "drizzle-orm";

import { getDb, requireDb } from "@/db/client";
import { returnStockForOrder, takeStockForOrder } from "@/db/stock";
import {
  adminUsers,
  auditLog,
  bundles,
  customers,
  deliveryRates,
  discounts,
  orders,
  productImages,
  products,
  stockLedger,
  variants,
} from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import {
  atLeast,
  getAdminSession,
  signIn,
  signOut,
  type AdminRole,
} from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import {
  generateTempPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { setSetting, type ShopSettings } from "@/lib/settings";

/**
 * Admin mutations.
 *
 * FOUR RULES EVERY ACTION FOLLOWS
 *
 * 1. **Re-check the session.** A server action is a public HTTP endpoint. The
 *    layout guard protects the *page*, not the action, anyone can POST to an
 *    action id directly, so the check has to be here too. This is the single
 *    most commonly missed thing in App Router apps.
 *
 * 2. **Write an audit row.** Every change records who, what and the before/after.
 *    Without it, "the price is wrong and nobody knows why" is unanswerable.
 *
 * 3. **Stock changes go through the ledger.** Never a bare UPDATE on `stockQty`.
 *    The quantity is a cache of the ledger's sum; writing one without the other
 *    is how inventory silently drifts from reality.
 *
 * 4. **Say what happened.** Every action returns an `ActionState`. They used to
 *    `return` on bad input, which meant a form could reject what you typed and
 *    look identical to one that saved it. Silent refusal is the worst outcome
 *    available: the user believes the change landed and finds out later from a
 *    customer.
 */

const log = logger.child({ module: "admin-actions" });

async function assertAdmin() {
  const session = await getAdminSession();
  if (!session.authenticated) throw new Error("Not authorised");
  return session;
}

/** Throws unless the signed-in person holds at least this role. */
async function assertRole(role: AdminRole) {
  const session = await assertAdmin();
  if (!atLeast(session, role)) {
    throw new Error(`This needs ${role} access.`);
  }
  return session;
}

/**
 * Records who did what.
 *
 * The actor is read from the session rather than hardcoded. Every row used to
 * say "admin", which meant the audit log could tell you a price changed and
 * never who changed it, and that is the only question anybody ever asks it.
 *
 * A shared-password session records `shared-password` rather than borrowing
 * somebody's name. A log that quietly attributes an anonymous login to a real
 * person is worse than one that admits it does not know.
 */
async function audit(
  action: string,
  entity: string,
  entityId: string,
  changes?: Record<string, unknown>,
) {
  const db = getDb();
  if (!db) return;

  const session = await getAdminSession();
  await db.insert(auditLog).values({
    actorId: session.userId,
    actorEmail: session.actorEmail || "unknown",
    action,
    entity,
    entityId,
    changes: changes ?? null,
  });
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  /*
    Sign-in is the one unauthenticated action on the admin, so it is the one an
    attacker can hammer. Five attempts a minute per address is invisible to
    somebody typing their own password and useless for guessing anybody else's.
  */
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";
  if (!rateLimit(`admin-signin:${ip}`, 5, 60_000).ok) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const result = await signIn(email, password);
  if (!result.ok) {
    // Deliberately does not say whether the email or the password was wrong.
    return { error: "That email and password combination is not right." };
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: result.mustChangePassword
      ? "Signed in. Please set your own password in Settings."
      : undefined,
  };
}

export async function signOutAction() {
  await signOut();
  revalidatePath("/admin");
}

/* -------------------------------------------------------------------------- */
/* Admin accounts                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Invites somebody, returning a one-time password to hand over.
 *
 * THE PASSWORD IS SHOWN ONCE AND NEVER STORED IN PLAINTEXT.
 *
 * There is no email provider guaranteed to be configured, so the realistic
 * delivery mechanism is Alberta reading it out or sending it on WhatsApp. That
 * is why it is generated from an alphabet with no O/0 or I/l/1 confusion, and
 * why the new account is flagged to change it on first sign-in.
 */
export async function inviteAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertRole("owner");
  const db = requireDb();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "staff") as AdminRole;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (!["owner", "manager", "staff"].includes(role)) {
    return { error: "Pick a role." };
  }

  const temporary = generateTempPassword();
  const passwordHash = await hashPassword(temporary);

  try {
    const [row] = await db
      .insert(adminUsers)
      .values({
        email,
        name,
        role,
        passwordHash,
        mustChangePassword: true,
        active: true,
      })
      .onConflictDoUpdate({
        target: adminUsers.email,
        // Re-inviting an existing address resets it rather than failing, which
        // is what somebody actually wants when a person has lost their password.
        set: { passwordHash, mustChangePassword: true, active: true, role },
      })
      .returning({ id: adminUsers.id });

    await audit("admin.invite", "admin_user", row.id, { email, role });
    revalidatePath("/admin/settings");
    return {
      ok: true,
      message: `Account ready for ${email}. One-time password: ${temporary}`,
    };
  } catch (error) {
    log.error("admin invite failed", { error: String(error) });
    return { error: "Could not create that account." };
  }
}

/** Deactivates or reactivates somebody. Never deletes: the audit log points here. */
export async function setAdminActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertRole("owner");
  const db = requireDb();

  const userId = String(formData.get("userId") ?? "");
  const active = formData.get("active") === "true";
  if (!userId) return { error: "Nothing to change." };

  if (userId === session.userId && !active) {
    return { error: "You cannot deactivate your own account." };
  }

  /*
    Refuse to remove the last active owner. A shop with no owner cannot invite
    anyone, cannot change a role, and can only be recovered through the shared
    bootstrap password or the database directly. Guarding it here is cheaper
    than the phone call.
  */
  if (!active) {
    const remaining = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.role, "owner"),
          eq(adminUsers.active, true),
          ne(adminUsers.id, userId),
        ),
      );
    const [target] = await db
      .select({ role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.id, userId));
    if (target?.role === "owner" && remaining.length === 0) {
      return { error: "That is the last owner. Make someone else an owner first." };
    }
  }

  await db
    .update(adminUsers)
    .set({ active })
    .where(eq(adminUsers.id, userId));

  await audit("admin.active", "admin_user", userId, { active });
  revalidatePath("/admin/settings");
  return { ok: true, message: active ? "Access restored" : "Access removed" };
}

/** Changes your own password. Requires the current one. */
export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertAdmin();
  const db = requireDb();

  if (!session.userId) {
    return {
      error:
        "You are signed in with the shared password. Create a personal account first.",
    };
  }

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 12) {
    // Length beats complexity rules. A 12-character passphrase is stronger and
    // far more likely to be remembered than eight characters of punctuation.
    return { error: "Use at least 12 characters. A short phrase works well." };
  }
  if (next !== confirm) return { error: "The two new passwords do not match." };

  const [user] = await db
    .select({ passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.userId));

  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "Your current password is not right." };
  }

  await db
    .update(adminUsers)
    .set({
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
    })
    .where(eq(adminUsers.id, session.userId));

  await audit("admin.password", "admin_user", session.userId, {});
  return { ok: true, message: "Password changed" };
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
export async function adjustStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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

  if (!variantId) return { error: "No size selected." };
  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Enter how many to add or remove." };
  }

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
  return {
    ok: true,
    message: delta > 0 ? `Added ${delta}` : `Removed ${Math.abs(delta)}`,
  };
}

export async function setStockSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const variantId = String(formData.get("variantId") ?? "");
  const trackStock = formData.get("trackStock") === "on";
  const lowStockThreshold = Number(formData.get("lowStockThreshold") ?? 5);
  if (!variantId) return { error: "No size selected." };

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
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Products & pricing                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Saves the editorial fields of one product.
 *
 * Price and stock are deliberately absent: they belong to a variant, and a form
 * that let you set "the price of Lemon Blast" would have to pick one of three
 * sizes to lie about. The variant rows handle those.
 */
export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { error: "No product selected." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "A product needs a name." };

  const status = String(formData.get("status") ?? "draft") as
    | "draft"
    | "active"
    | "archived";
  const line = String(formData.get("line") ?? "supporting") as
    | "flagship"
    | "supporting";
  const categoryId = String(formData.get("categoryId") ?? "") || null;

  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const changes = {
    name,
    status,
    line,
    categoryId,
    blurb: text("blurb"),
    description: text("description"),
    ingredients: text("ingredients"),
    howToUse: text("howToUse"),
    isBestSeller: formData.get("isBestSeller") === "on",
    isNew: formData.get("isNew") === "on",
    archivedAt: status === "archived" ? new Date() : null,
    updatedAt: new Date(),
  };

  await db.update(products).set(changes).where(eq(products.id, productId));

  await audit("product.save", "product", productId, changes);
  log.info("product saved", { productId, name });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  return {
    ok: true,
    message:
      status === "active"
        ? "Saved and live on the shop"
        : `Saved as ${status === "draft" ? "a draft" : "archived"}`,
  };
}

/** Adds an image by URL. Upload lands when image storage is chosen. */
export async function addProductImageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const productId = String(formData.get("productId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim() || null;
  if (!productId || !url) return { error: "Enter the address of a picture." };

  const [{ next } = { next: 0 }] = await db
    .select({
      next: sql<number>`coalesce(max(${productImages.position}), -1) + 1`,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  await db
    .insert(productImages)
    .values({ productId, url, alt, position: Number(next) });

  await audit("product.image.add", "product", productId, { url });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: "Picture added" };
}

export async function removeProductImageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const imageId = String(formData.get("imageId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!imageId) return { error: "Nothing to remove." };

  await db.delete(productImages).where(eq(productImages.id, imageId));
  await audit("product.image.remove", "product", productId, { imageId });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: "Removed" };
}

export async function setVariantPriceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const variantId = String(formData.get("variantId") ?? "");
  // Input is in cedis for the human; stored as pesewas.
  const priceMajor = Number(formData.get("price") ?? NaN);
  const compareMajor = Number(formData.get("compareAt") ?? NaN);
  if (!variantId) return { error: "No size selected." };
  if (!Number.isFinite(priceMajor) || priceMajor < 0) {
    return { error: "Enter a price." };
  }

  // A "was" price below the price would render as a negative saving.
  const showsSaving =
    Number.isFinite(compareMajor) && compareMajor > priceMajor;

  await db
    .update(variants)
    .set({
      priceMinor: Math.round(priceMajor * 100),
      compareAtMinor: showsSaving ? Math.round(compareMajor * 100) : null,
      updatedAt: new Date(),
    })
    .where(eq(variants.id, variantId));

  await audit("variant.price", "variant", variantId, {
    priceMinor: Math.round(priceMajor * 100),
  });

  const productId = String(formData.get("productId") ?? "");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");

  // Worth saying out loud: a "was" price at or below the price is dropped
  // rather than stored, and without this the user would think it saved.
  const compareGiven = String(formData.get("compareAt") ?? "").trim() !== "";
  if (compareGiven && !showsSaving) {
    return {
      ok: true,
      message: "Price saved. The 'was' price was ignored, it must be higher.",
    };
  }
  return { ok: true, message: "Price saved" };
}

/* -------------------------------------------------------------------------- */
/* Promotions                                                                 */
/* -------------------------------------------------------------------------- */

export async function createDiscountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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

  if (!name) return { error: "Give the discount a name." };
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return { error: "Enter how much comes off." };
  }

  // Percentage is a whole number 1-100; fixed amount arrives in cedis.
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
  return { ok: true, message: `"${name}" created and switched on` };
}

export async function toggleDiscountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();
  const id = String(formData.get("discountId") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return { error: "No discount selected." };

  await db
    .update(discounts)
    .set({ active, updatedAt: new Date() })
    .where(eq(discounts.id, id));
  await audit("discount.toggle", "discount", id, { active });
  revalidatePath("/admin/promotions");
  return { ok: true, message: active ? "Switched on" : "Switched off" };
}

export async function createBundleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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

  if (!name) return { error: "Give the bundle a name." };
  if (!slug) return { error: "The web address cannot be empty." };

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
  return { ok: true, message: `"${name}" created` };
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Sets, or clears, the delivery charge for one region.
 *
 * Clearing is a DELETE rather than a zero. A region with no row means "we will
 * quote this by phone" and the checkout says exactly that; a row of 0 means
 * free delivery. Collapsing the two is how a shop ends up couriering to Tamale
 * for nothing.
 */
export async function setDeliveryRateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const region = String(formData.get("region") ?? "").trim();
  if (!region) return { error: "No region selected." };

  const raw = String(formData.get("fee") ?? "").trim();
  const freeRaw = String(formData.get("freeOver") ?? "").trim();
  const etaLabel = String(formData.get("etaLabel") ?? "").trim() || null;

  // Empty fee means "unset this region", not "free".
  if (raw === "") {
    await db.delete(deliveryRates).where(eq(deliveryRates.region, region));
    await audit("delivery.clear", "delivery_rate", region);
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    return { ok: true, message: "Cleared, quoted by hand again" };
  }

  const feeMajor = Number(raw);
  if (!Number.isFinite(feeMajor) || feeMajor < 0) {
    return { error: "Enter a charge, or clear it to quote by hand." };
  }
  const freeMajor = Number(freeRaw);

  const values = {
    region,
    feeMinor: Math.round(feeMajor * 100),
    freeOverMinor:
      freeRaw !== "" && Number.isFinite(freeMajor) && freeMajor > 0
        ? Math.round(freeMajor * 100)
        : null,
    etaLabel,
    active: true,
    updatedAt: new Date(),
  };

  await db
    .insert(deliveryRates)
    .values(values)
    .onConflictDoUpdate({ target: deliveryRates.region, set: values });

  await audit("delivery.set", "delivery_rate", region, values);
  log.info("delivery rate set", { region, feeMinor: values.feeMinor });
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  return {
    ok: true,
    message: feeMajor === 0 ? "Free delivery to this region" : "Saved",
  };
}

export async function saveShopSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  requireDb();

  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").replace(
    /\D/g,
    "",
  );
  const orderEmail = String(formData.get("orderEmail") ?? "").trim();
  const lowStockDefault = Number(formData.get("lowStockDefault") ?? 5);

  const updates: Partial<ShopSettings> = {
    whatsappNumber,
    orderEmail,
    lowStockDefault: Number.isFinite(lowStockDefault)
      ? Math.max(0, Math.round(lowStockDefault))
      : 5,
  };

  for (const [key, value] of Object.entries(updates)) {
    await setSetting(key as keyof ShopSettings, value as never);
  }

  await audit("settings.save", "settings", "shop", updates);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * The strip above the header.
 *
 * Saved as one object rather than three keys so the banner can never be half
 * updated: a deploy that changed the text but not the link would show the wrong
 * offer pointing at the right page.
 */
export async function saveAnnouncementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  requireDb();

  const announcement = {
    text: String(formData.get("text") ?? "").trim().slice(0, 160),
    href: String(formData.get("href") ?? "/shop").trim() || "/shop",
    active: formData.get("active") === "on",
  };

  if (announcement.active && !announcement.text) {
    return { error: "A banner with no words cannot be shown." };
  }

  await setSetting("announcement", announcement);
  await audit(
    "settings.announcement",
    "settings",
    "announcement",
    announcement,
  );
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: announcement.active ? "Showing on the shop" : "Saved and hidden",
  };
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveCustomerNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const customerId = String(formData.get("customerId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!customerId) return { error: "No customer selected." };

  await db.update(customers).set({ notes }).where(eq(customers.id, customerId));

  await audit("customer.note", "customer", customerId);
  revalidatePath("/admin/customers");
  return { ok: true, message: notes ? "Note saved" : "Note cleared" };
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sets the delivery charge and recomputes the total.
 *
 * This is the missing half of the order workflow: a customer places an order,
 * we confirm what delivery costs to their town, and only then is there a real
 * number to charge. Until this existed the shop could take an order it could
 * never total.
 *
 * The total is recomputed here rather than trusted from the form, the client
 * has no business telling the server what an order comes to.
 */
export async function setDeliveryFeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const orderId = String(formData.get("orderId") ?? "");
  const feeMajor = Number(formData.get("deliveryFee") ?? NaN);
  const note = String(formData.get("internalNote") ?? "") || null;
  if (!orderId) return { error: "No order selected." };
  if (!Number.isFinite(feeMajor) || feeMajor < 0) {
    return { error: "Enter what delivery costs." };
  }

  const feeMinor = Math.round(feeMajor * 100);

  const [existing] = await db
    .select({
      subtotal: orders.subtotalMinor,
      discount: orders.discountMinor,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!existing) return { error: "That order no longer exists." };

  const total = existing.subtotal - existing.discount + feeMinor;

  await db
    .update(orders)
    .set({
      deliveryMinor: feeMinor,
      totalMinor: total,
      // Quoting the delivery IS the confirmation step, so the status follows.
      status: "confirmed",
      ...(note ? { internalNote: note } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await audit("order.delivery", "order", orderId, { feeMinor, total });
  log.info("delivery quoted", { orderId, feeMinor, total });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, message: "Total updated, order confirmed" };
}

export async function setOrderStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
  if (!orderId || !status) return { error: "Nothing to change." };

  /*
    STATUS AND STOCK MOVE TOGETHER, IN ONE TRANSACTION.

    Marking an order paid is the moment the sale becomes real, so it is also the
    moment the goods leave the shelf. Cancelling or refunding puts them back.
    Doing the two in separate statements would eventually leave an order marked
    paid with no matching ledger rows after a crash, and a stock count nobody
    can reconcile is worse than no stock count.

    Both helpers are idempotent, keyed on the order id in the ledger, so the
    dropdown can be moved paid -> packed -> paid without eating inventory three
    times. See db/stock.ts.
  */
  const takesStock = status === "paid";
  const returnsStock = status === "cancelled" || status === "refunded";

  const outcome = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ reference: orders.reference, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!existing) return null;

    await tx
      .update(orders)
      .set({
        status,
        // Marking an order paid is the one status that also settles payment,
        // otherwise the two fields drift and revenue reporting is wrong.
        ...(status === "paid" ? { paymentStatus: "paid" as const } : {}),
        ...(status === "refunded"
          ? { paymentStatus: "refunded" as const }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    if (takesStock) {
      return takeStockForOrder(tx, orderId, existing.reference);
    }
    if (returnsStock) {
      return returnStockForOrder(tx, orderId, existing.reference);
    }
    return null;
  });

  if (!outcome && (takesStock || returnsStock)) {
    // The order row was missing, or nothing matched a tracked variant.
    log.warn("status changed with no stock movement", { orderId, status });
  }

  await audit("order.status", "order", orderId, {
    status,
    stockMoved: outcome?.moved ?? false,
    units: outcome?.units ?? 0,
  });
  log.info("order status changed", { orderId, status });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/stock");
  revalidatePath("/admin");

  /*
    An oversell is surfaced, not swallowed. The order still goes through, since
    somebody holding the product knows better than the count does, but the
    person who just took the money is the right person to hear that the shelf
    disagrees, and they will never hear it from a log line.
  */
  if (outcome?.oversold.length) {
    return {
      ok: true,
      message: `Marked paid. Stock was short on ${outcome.oversold.join(", ")}, so the count needs checking.`,
    };
  }

  if (outcome?.moved) {
    return {
      ok: true,
      message: takesStock
        ? `Marked paid, ${outcome.units} ${outcome.units === 1 ? "unit" : "units"} off stock`
        : `Moved to ${status}, ${outcome.units} ${outcome.units === 1 ? "unit" : "units"} back in stock`,
    };
  }

  return {
    ok: true,
    message: status === "paid" ? "Marked paid" : `Moved to ${status}`,
  };
}
