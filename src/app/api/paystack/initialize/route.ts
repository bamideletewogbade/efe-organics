import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { orders } from "@/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { initializePaystackTransaction } from "@/lib/paystack";

const log = logger.child({ route: "api/paystack/initialize" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reference = String(body?.reference ?? "").trim();

    if (!reference) {
      return NextResponse.json(
        { ok: false, error: "Order reference is required." },
        { status: 400 },
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "Database not connected." },
        { status: 503 },
      );
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.reference, reference));

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 },
      );
    }

    if (!order.deliveryEmail) {
      return NextResponse.json(
        { ok: false, error: "Customer email is missing for payment." },
        { status: 400 },
      );
    }

    const siteUrl = env.public.siteUrl;
    const callbackUrl = `${siteUrl}/cart?reference=${order.reference}&paid=true`;

    const paystackRes = await initializePaystackTransaction({
      email: order.deliveryEmail,
      amountMinor: order.totalMinor,
      reference: order.reference,
      callbackUrl,
      metadata: {
        orderId: order.id,
        reference: order.reference,
        customerName: order.deliveryName,
        phone: order.deliveryPhone,
      },
    });

    if (!paystackRes.status || !paystackRes.data) {
      return NextResponse.json(
        { ok: false, error: paystackRes.message || "Failed to initialize payment." },
        { status: 400 },
      );
    }

    log.info("Paystack payment initialized", {
      reference: order.reference,
      authorizationUrl: paystackRes.data.authorization_url,
    });

    return NextResponse.json({
      ok: true,
      authorizationUrl: paystackRes.data.authorization_url,
      accessCode: paystackRes.data.access_code,
      reference: order.reference,
    });
  } catch (error) {
    log.error("Error initializing Paystack checkout", { error });
    return NextResponse.json(
      { ok: false, error: "Payment processing failed." },
      { status: 500 },
    );
  }
}
