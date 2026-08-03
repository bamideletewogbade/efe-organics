"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireDb } from "@/db/client";
import {
  auditLog,
  customers,
  documents,
  importBatches,
  orders,
  variants,
} from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { getAdminSession } from "@/lib/admin-auth";
import { parseCsv, toDate, toInteger, toMinorUnits } from "@/lib/csv";
import { SCHEMAS, type ImportEntity, type Mapping } from "@/lib/import-map";
import { logger } from "@/lib/logger";

/**
 * Bringing the old business in.
 *
 * TWO RULES SPECIFIC TO IMPORTING
 *
 * 1. **An import must be safe to run twice.** People re-upload. They fix one
 *    row in Excel and send the whole file again. Orders are keyed on the old
 *    system's own order number and customers on email, both unique, so a second
 *    run updates rather than duplicates. Without that, one nervous double-click
 *    invents a second year of revenue and nobody notices until the accounts
 *    disagree.
 *
 * 2. **A skipped row must say why.** "412 of 500 imported" is not a result, it
 *    is the start of an argument. Every rejection is recorded with its row
 *    number and reason, so the owner can fix the spreadsheet instead of
 *    guessing.
 */

const log = logger.child({ module: "import" });

const MAX_ROWS = 20_000;
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

async function assertAdmin() {
  const session = await getAdminSession();
  if (!session.authenticated) throw new Error("Not authorised");
  return session;
}

/** Maps whatever the old system called a status onto ours. */
function readStatus(raw: string): {
  status: "pending" | "paid" | "delivered" | "cancelled";
  paid: boolean;
} {
  const text = raw.toLowerCase();
  if (/cancel|void|refund/.test(text)) return { status: "cancelled", paid: false };
  if (/deliver|complete|fulfil|fulfill|shipped/.test(text)) {
    return { status: "delivered", paid: true };
  }
  if (/paid|payment accepted|processed/.test(text)) {
    return { status: "paid", paid: true };
  }
  return { status: "pending", paid: false };
}

type Row = string[];

const cell = (row: Row, index: number | null | undefined): string =>
  index == null ? "" : (row[index] ?? "").trim();

/* -------------------------------------------------------------------------- */
/* Committing an import                                                       */
/* -------------------------------------------------------------------------- */

export async function commitImportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const entity = String(formData.get("entity") ?? "") as ImportEntity;
  if (!SCHEMAS[entity]) return { error: "Unknown kind of file." };

  /*
    The FILE is re-sent and re-parsed here rather than the browser posting the
    rows it already parsed. Two reasons.

    Practically, a server action body is capped at 1MB by default and a real
    order export blows through that as JSON long before it does as a file.

    More importantly, it means the server is the only thing that ever parses for
    real. The browser's parse exists purely to draw a preview, so a tampered or
    simply buggy client cannot decide what lands in the orders table.
  */
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "The file did not arrive. Try choosing it again." };
  }

  let mapping: Mapping;
  try {
    mapping = JSON.parse(String(formData.get("mapping") ?? "{}"));
  } catch {
    return { error: "The column mapping was not readable." };
  }

  const parsed = parseCsv(await file.text());
  const rows: Row[] = parsed.rows;
  const filename = file.name;

  if (rows.length === 0) {
    return { error: "That file has a header row but no data." };
  }
  if (rows.length > MAX_ROWS) {
    return {
      error: `That file has ${rows.length.toLocaleString()} rows. Split it into files of ${MAX_ROWS.toLocaleString()} or fewer.`,
    };
  }

  const missing = SCHEMAS[entity].fields
    .filter((f) => f.required && mapping[f.key] == null)
    .map((f) => f.label);
  if (missing.length) {
    return { error: `Still need a column for: ${missing.join(", ")}.` };
  }

  const skipped: Array<{ row: number; reason: string }> = [];
  let imported = 0;

  const [batch] = await db
    .insert(importBatches)
    .values({ filename, entity, rowsTotal: rows.length })
    .returning({ id: importBatches.id });

  try {
    for (const [index, row] of rows.entries()) {
      const line = index + 2; // +1 for zero-index, +1 for the header row
      try {
        if (entity === "orders") {
          const legacy = cell(row, mapping.legacyReference);
          const total = toMinorUnits(cell(row, mapping.totalMinor));
          const placed = toDate(cell(row, mapping.placedAt));

          if (!legacy) {
            skipped.push({ row: line, reason: "No order number" });
            continue;
          }
          if (total === null) {
            skipped.push({ row: line, reason: "Could not read the order total" });
            continue;
          }
          if (!placed) {
            skipped.push({ row: line, reason: "Could not read the order date" });
            continue;
          }

          const email = cell(row, mapping.customerEmail).toLowerCase();
          const name = cell(row, mapping.customerName) || null;
          const phone = cell(row, mapping.customerPhone) || null;

          let customerId: string | null = null;
          if (email) {
            const [customer] = await db
              .insert(customers)
              .values({ email, name, phone })
              .onConflictDoUpdate({
                target: customers.email,
                // Only fill blanks. An import must not wipe a name someone
                // corrected by hand in the admin.
                set: {
                  name: name ?? customers.name,
                  phone: phone ?? customers.phone,
                },
              })
              .returning({ id: customers.id });
            customerId = customer?.id ?? null;
          }

          const delivery = toMinorUnits(cell(row, mapping.deliveryMinor));
          const discount = toMinorUnits(cell(row, mapping.discountMinor)) ?? 0;
          const subtotal =
            toMinorUnits(cell(row, mapping.subtotalMinor)) ??
            total - (delivery ?? 0) + discount;

          const { status, paid } = readStatus(cell(row, mapping.status));
          const items = cell(row, mapping.itemsText);

          await db
            .insert(orders)
            .values({
              reference: `OLD-${legacy}`.slice(0, 32),
              legacyReference: legacy.slice(0, 120),
              importBatchId: batch.id,
              customerId,
              status,
              paymentStatus: paid ? "paid" : "unpaid",
              subtotalMinor: subtotal,
              discountMinor: discount,
              deliveryMinor: delivery,
              totalMinor: total,
              deliveryName: name,
              deliveryPhone: phone,
              deliveryEmail: email || null,
              deliveryTown: cell(row, mapping.town) || null,
              deliveryRegion: cell(row, mapping.region) || null,
              deliveryAddress: cell(row, mapping.address) || null,
              internalNote: items ? `Imported. Items: ${items}` : "Imported",
              placedAt: placed,
            })
            .onConflictDoUpdate({
              target: orders.legacyReference,
              set: {
                totalMinor: total,
                subtotalMinor: subtotal,
                status,
                paymentStatus: paid ? "paid" : "unpaid",
                importBatchId: batch.id,
                updatedAt: new Date(),
              },
            });

          imported++;
          continue;
        }

        if (entity === "customers") {
          const email = cell(row, mapping.email).toLowerCase();
          if (!email || !email.includes("@")) {
            skipped.push({ row: line, reason: "No usable email address" });
            continue;
          }
          const consent = cell(row, mapping.acceptsMarketing).toLowerCase();

          await db
            .insert(customers)
            .values({
              email,
              name: cell(row, mapping.name) || null,
              phone: cell(row, mapping.phone) || null,
              // Anything other than an explicit yes is treated as no.
              acceptsMarketing: /^(y|yes|true|1|subscribed)$/.test(consent),
              notes: cell(row, mapping.notes) || null,
            })
            .onConflictDoUpdate({
              target: customers.email,
              set: {
                name: cell(row, mapping.name) || null,
                phone: cell(row, mapping.phone) || null,
              },
            });

          imported++;
          continue;
        }

        // products: prices and stock only, matched on SKU. Creating products
        // from a spreadsheet would fight the catalogue rather than help it.
        const sku = cell(row, mapping.sku);
        if (!sku) {
          skipped.push({ row: line, reason: "No SKU to match on" });
          continue;
        }
        const price = toMinorUnits(cell(row, mapping.priceMinor));
        if (price === null) {
          skipped.push({ row: line, reason: "Could not read the price" });
          continue;
        }
        const stock = toInteger(cell(row, mapping.stockQty));

        const result = await db
          .update(variants)
          .set({
            priceMinor: price,
            compareAtMinor: toMinorUnits(cell(row, mapping.compareAtMinor)),
            ...(stock !== null ? { stockQty: Math.max(0, stock) } : {}),
            updatedAt: new Date(),
          })
          .where(eq(variants.sku, sku))
          .returning({ id: variants.id });

        if (result.length === 0) {
          skipped.push({ row: line, reason: `No product with SKU ${sku}` });
          continue;
        }
        imported++;
      } catch (error) {
        skipped.push({
          row: line,
          reason: error instanceof Error ? error.message : "Unreadable row",
        });
      }
    }

    await db
      .update(importBatches)
      .set({
        status: "committed",
        rowsImported: imported,
        rowsSkipped: skipped.length,
        report: { mapping, skipped: skipped.slice(0, 500) },
      })
      .where(eq(importBatches.id, batch.id));

    await db.insert(auditLog).values({
      action: "import.commit",
      entity: "import_batch",
      entityId: batch.id,
      actorEmail: "admin",
      changes: { filename, entity, imported, skipped: skipped.length },
    });

    log.info("import committed", { entity, imported, skipped: skipped.length });

    revalidatePath("/admin/import");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");
    revalidatePath("/admin");

    if (imported === 0) {
      return {
        error: `Nothing imported. ${skipped[0]?.reason ?? "Check the column mapping."}`,
      };
    }
    return {
      ok: true,
      message:
        skipped.length === 0
          ? `Imported all ${imported.toLocaleString()} rows`
          : `Imported ${imported.toLocaleString()}, skipped ${skipped.length}. See the report below.`,
    };
  } catch (error) {
    await db
      .update(importBatches)
      .set({ status: "failed", report: { error: String(error) } })
      .where(eq(importBatches.id, batch.id));
    log.error("import failed", { error });
    return { error: "The import stopped partway. Nothing further was changed." };
  }
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

export async function uploadDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 8MB.`,
    };
  }
  if (file.type && !ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return {
      error: "That file type is not accepted. Use PDF, Word, Excel, CSV or an image.",
    };
  }

  const kind = String(formData.get("kind") ?? "other") as
    | "price_list"
    | "supplier"
    | "certificate"
    | "financial"
    | "brand"
    | "data_export"
    | "other";

  const content = Buffer.from(await file.arrayBuffer());

  const [row] = await db
    .insert(documents)
    .values({
      name: String(formData.get("name") ?? "").trim() || file.name,
      kind,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      content,
      notes: String(formData.get("notes") ?? "").trim() || null,
      uploadedBy: "admin",
    })
    .returning({ id: documents.id });

  await db.insert(auditLog).values({
    action: "document.upload",
    entity: "document",
    entityId: row.id,
    actorEmail: "admin",
    changes: { name: file.name, kind, sizeBytes: file.size },
  });

  log.info("document uploaded", { id: row.id, kind, sizeBytes: file.size });
  revalidatePath("/admin/documents");
  return { ok: true, message: "Uploaded" };
}

export async function deleteDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const db = requireDb();

  const id = String(formData.get("documentId") ?? "");
  if (!id) return { error: "Nothing selected." };

  await db.delete(documents).where(eq(documents.id, id));
  await db.insert(auditLog).values({
    action: "document.delete",
    entity: "document",
    entityId: id,
    actorEmail: "admin",
  });

  revalidatePath("/admin/documents");
  return { ok: true, message: "Deleted" };
}
