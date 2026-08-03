import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/layout/Container";
import { capabilities } from "@/lib/env";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Container className="py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/cart" className="hover:text-accent">
          Basket
        </Link>
        <span aria-hidden> / </span>
        <span className="text-strong">Checkout</span>
      </nav>

      <h1 className="mt-4 text-3xl sm:text-4xl">Checkout</h1>

      {/* `capabilities.hasPaystack` is false until BOTH Paystack keys exist,
          the form uses it to tell the customer what will actually happen next
          rather than promising a payment screen that is not there. */}
      <CheckoutForm paystackReady={capabilities.hasPaystack} />
    </Container>
  );
}
