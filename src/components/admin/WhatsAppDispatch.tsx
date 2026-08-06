"use client";

import { formatPrice } from "@/lib/money";

type OrderDetails = {
  reference: string;
  customerName: string | null;
  deliveryPhone: string | null;
  deliveryTown: string | null;
  totalMinor: number;
  status: string;
};

function formatPhoneForWhatsApp(phone: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/[^0-9]/g, "");
  // If starts with 0 (Ghana local format 024...), replace leading 0 with 233
  if (digits.startsWith("0")) {
    digits = "233" + digits.substring(1);
  }
  return digits;
}

export function WhatsAppDispatch({ order }: { order: OrderDetails }) {
  const phone = formatPhoneForWhatsApp(order.deliveryPhone);
  const name = order.customerName || "Valued Customer";
  const total = formatPrice(order.totalMinor);

  if (!phone) {
    return (
      <div className="rounded-xl border border-line bg-surface-sunken p-3 text-xs text-muted">
        No phone number recorded for WhatsApp dispatch.
      </div>
    );
  }

  const templates = [
    {
      label: "Order Quote & Confirm",
      tone: "info" as const,
      text: `Hello ${name}! 👋 Thank you for ordering from Efe Organics. Your order #${order.reference} total is ${total} (${order.deliveryTown ? "Delivery to " + order.deliveryTown : "Standard delivery"}). Please let us know if your delivery address is confirmed!`,
    },
    {
      label: "Send MoMo Instructions",
      tone: "warn" as const,
      text: `Hello ${name}! To complete your payment for Efe Organics order #${order.reference} (${total}), please transfer to our MTN Mobile Money merchant number. Reference: ${order.reference}. Thank you!`,
    },
    {
      label: "Out for Delivery",
      tone: "good" as const,
      text: `Hello ${name}! 🌿 Great news! Your Efe Organics order #${order.reference} is packed and on its way with the dispatch rider. Thank you for choosing organic skincare!`,
    },
  ];

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold text-strong">
        WhatsApp Customer Dispatch
      </p>
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl, i) => {
          const encoded = encodeURIComponent(tpl.text);
          const href = `https://wa.me/${phone}?text=${encoded}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-strong transition-colors hover:border-accent/50 hover:bg-surface-sunken"
            >
              <svg
                className="h-3.5 w-3.5 text-emerald-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.149 4.192 4.292-1.125z" />
              </svg>
              {tpl.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
