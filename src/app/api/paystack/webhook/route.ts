import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { orderItems, orders } from "@/db/schema";
import { takeStockForOrder } from "@/db/stock";
import { sendCustomerOrderEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/paystack/webhook" });

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const secretKey = env.server.paystackSecretKey;

    if (!secretKey) {
      log.warn("PAYSTACK_SECRET_KEY missing. Webhook ignored.");
      return NextResponse.json(
        { ok: false, error: "Paystack secret key not configured." },
        { status: 400 },
      );
    }

    if (!signature) {
      log.warn("Missing Paystack signature header.");
      return NextResponse.json(
        { ok: false, error: "Missing signature." },
        { status: 401 },
      );
    }

    // Verify HMAC SHA512 signature
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      log.warn("Invalid Paystack webhook signature match.");
      return NextResponse.json(
        { ok: false, error: "Invalid signature." },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload?.event;
    const data = payload?.data;

    log.info("Paystack webhook received", { event, reference: data?.reference });

    if (event === "charge.success" && data?.reference) {
      const reference = String(data.reference).trim();
      const paystackRef = String(data.id || data.reference);

      const db = getDb();
      if (db) {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.reference, reference));

        if (existingOrder) {
          // 1. Update order status and payment status in DB
          await db
            .update(orders)
            .set({
              paymentStatus: "paid",
              status: "paid",
              paystackReference: paystackRef,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, existingOrder.id));

          // 2. Decrement stock from inventory ledger
          const stockResult = await takeStockForOrder(
            db,
            existingOrder.id,
            existingOrder.reference,
          );

          log.info("Order marked paid via Paystack webhook", {
            reference: existingOrder.reference,
            stockMoved: stockResult?.moved,
          });

          // 3. Fetch order items for customer email receipt
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, existingOrder.id));

          if (existingOrder.deliveryEmail) {
            await sendCustomerOrderEmail({
              reference: existingOrder.reference,
              customerName: existingOrder.deliveryName,
              customerEmail: existingOrder.deliveryEmail,
              deliveryPhone: existingOrder.deliveryPhone,
              deliveryAddress: existingOrder.deliveryAddress,
              deliveryTown: existingOrder.deliveryTown,
              deliveryRegion: existingOrder.deliveryRegion,
              subtotalMinor: existingOrder.subtotalMinor,
              deliveryMinor: existingOrder.deliveryMinor,
              discountMinor: existingOrder.discountMinor,
              taxMinor: existingOrder.taxMinor,
              totalMinor: existingOrder.totalMinor,
              items: items.map((item) => ({
                name: item.nameSnapshot,
                size: item.sizeSnapshot,
                quantity: item.quantity,
                unitPriceMinor: item.unitPriceMinor,
                lineTotalMinor: item.lineTotalMinor,
              })),
            });
          }
        } else {
          log.warn("Order reference from Paystack not found in database", {
            reference,
          });
        }
      }
    }

    return NextResponse.json({ status: true });
  } catch (error) {
    log.error("Error processing Paystack webhook", { error });
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed." },
      { status: 500 },
    );
  }
}
