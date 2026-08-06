import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { productImages, products } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api-upload" });

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const productId = String(formData.get("productId") ?? "").trim();
    const alt = String(formData.get("alt") ?? "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, WebP or AVIF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image file is too large (maximum 5MB)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".webp";
    const sanitizeName = file.name
      .replace(ext, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const filename = `${sanitizeName}-${Date.now()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/products/${filename}`;

    const db = getDb();
    if (db && productId) {
      // Find current images to set display order
      const existing = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, productId));

      await db.insert(productImages).values({
        productId,
        url: publicUrl,
        alt: alt || file.name,
        position: existing.length,
      });

      log.info("Product image uploaded & recorded", { productId, publicUrl });
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      alt: alt || file.name,
    });
  } catch (error) {
    log.error("Failed to upload image", { error });
    return NextResponse.json(
      { error: "Failed to process image upload." },
      { status: 500 },
    );
  }
}
