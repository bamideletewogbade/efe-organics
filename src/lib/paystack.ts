import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "paystack" });

const PAYSTACK_API_BASE = "https://api.paystack.co";

export type InitializePayload = {
  email: string;
  amountMinor: number; // in pesewas (GH₵1.00 = 100 pesewas)
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
};

export type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    customer: {
      email: string;
    };
  };
};

export async function initializePaystackTransaction(
  payload: InitializePayload,
): Promise<PaystackInitializeResponse> {
  const secretKey = env.server.paystackSecretKey;

  if (!secretKey) {
    log.warn("PAYSTACK_SECRET_KEY missing, transaction initialization skipped");
    return {
      status: false,
      message: "Paystack secret key is not configured.",
    };
  }

  try {
    const res = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        amount: payload.amountMinor,
        currency: "GHS",
        reference: payload.reference,
        callback_url: payload.callbackUrl,
        metadata: payload.metadata,
      }),
    });

    const data: PaystackInitializeResponse = await res.json();
    if (!res.ok) {
      log.error("Paystack initialization failed", { message: data.message });
    }
    return data;
  } catch (error) {
    log.error("Error calling Paystack initialize endpoint", { error });
    return {
      status: false,
      message: "Failed to connect to Paystack gateway.",
    };
  }
}

export async function verifyPaystackTransaction(
  reference: string,
): Promise<PaystackVerifyResponse> {
  const secretKey = env.server.paystackSecretKey;
  if (!secretKey) {
    return { status: false, message: "Paystack secret key missing" };
  }

  try {
    const res = await fetch(
      `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    return (await res.json()) as PaystackVerifyResponse;
  } catch (error) {
    log.error("Error verifying Paystack transaction", { reference, error });
    return { status: false, message: "Network error during verification" };
  }
}
