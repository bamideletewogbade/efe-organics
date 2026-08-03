import type { Metadata } from "next";

import { CartView } from "@/components/cart/CartView";
import { Container } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Your basket",
  robots: { index: false, follow: false },
};

/**
 * Basket review.
 *
 * The drawer handles the quick "did that add?" moment; this page is for the
 * considered pass before paying. Bigger imagery, room for delivery and payment
 * reassurance, and a layout that survives a long list.
 *
 * `noindex`. A personal basket is not a search result.
 */
export default function CartPage() {
  return (
    <Container className="py-10 lg:py-14">
      <h1 className="text-3xl sm:text-4xl">Your basket</h1>
      <CartView />
    </Container>
  );
}
