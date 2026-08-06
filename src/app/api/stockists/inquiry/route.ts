import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { stockists, wholesaleInquiries } from "@/db/schema";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/stockists/inquiry" });

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const businessName = String(body?.businessName || body?.business || "Unnamed Business").trim();
    const contactName = String(body?.contactName || body?.name || "Trade Contact").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const businessType = String(body?.businessType || body?.interest || "retail_shop").trim();
    const interest = String(body?.interest || body?.subject || "General Wholesale").trim();
    const estimatedVolume = String(body?.volume || body?.estimatedVolume || "Trial Order").trim();
    const region = String(body?.region || body?.location || "Greater Accra").trim();
    const town = String(body?.town || body?.location || "Accra").trim();
    const message = String(body?.message || body?.notes || "").trim();

    if (!email || !phone) {
      return NextResponse.json(
        { ok: false, error: "Email and phone number are required." },
        { status: 400 },
      );
    }

    const db = getDb();
    if (!db) {
      log.warn("Database unconfigured. Stockist inquiry recorded locally:", {
        businessName,
        email,
      });
      return NextResponse.json({
        ok: true,
        message: "Inquiry received. We will contact you shortly.",
      });
    }

    // 1. Create or update Stockist record
    const [stockist] = await db
      .insert(stockists)
      .values({
        businessName,
        contactName,
        email,
        phone,
        businessType,
        tier: "bronze",
        status: "pending",
        region,
        town,
        notes: message,
      })
      .onConflictDoUpdate({
        target: stockists.email,
        set: {
          businessName,
          contactName,
          phone,
          updatedAt: new Date(),
        },
      })
      .returning({ id: stockists.id });

    // 2. Insert Wholesale Inquiry row
    await db.insert(wholesaleInquiries).values({
      stockistId: stockist?.id || null,
      businessName,
      contactName,
      email,
      phone,
      interest,
      estimatedVolume,
      message,
    });

    log.info("Stockist inquiry saved to database", {
      businessName,
      email,
      interest,
    });

    return NextResponse.json({
      ok: true,
      message: "Thank you! Your stockist & trade inquiry has been received.",
    });
  } catch (error) {
    log.error("Failed to save stockist inquiry", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to process inquiry submission." },
      { status: 500 },
    );
  }
}
