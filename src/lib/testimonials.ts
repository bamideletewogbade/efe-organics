/**
 * ⚠️ PLACEHOLDER CONTENT — NOT REAL CUSTOMER REVIEWS. DO NOT LAUNCH WITH THIS.
 *
 * Efe has no collected reviews today: every product on the reseller shows
 * "0 reviews". Publishing invented testimonials attributed to named customers
 * would be fabricating social proof about a real business, so these exist only
 * to build and review the component against realistic text.
 *
 * `PLACEHOLDER` below is read by the section component, which renders a visible
 * "sample content" marker whenever it is true. Delete this file's contents and
 * flip the flag when real reviews arrive — see docs/OPEN-QUESTIONS.md.
 *
 * How to get real ones, cheaply: the products ship with a label; add a short
 * URL or QR to a one-question review form, and ask the stockists to collect
 * them too. That is a Phase 2 task, not a blocker for the design.
 */

export const PLACEHOLDER = true;

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  /** Which product the review is about — links the quote to the catalogue. */
  productSlug?: string;
  rating: number;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I switched from a medicated wash to the black soap bath and my skin settled within a fortnight. The lemon one is the only thing my whole household agrees on.",
    name: "Sample review",
    role: "Replace before launch",
    productSlug: "lemon-blast-black-soap-bath-500ml",
    rating: 5,
  },
  {
    quote:
      "I run a small salon in Osu and I buy the one-litre shampoo. It works out far cheaper than the imported brands and my clients ask what I am using.",
    name: "Sample review",
    role: "Replace before launch",
    productSlug: "herbal-hair-shampoo-1l",
    rating: 5,
  },
  {
    quote:
      "The hair food and the scalp oil together have done more for my edges in three months than anything else I have tried. Worth the price.",
    name: "Sample review",
    role: "Replace before launch",
    productSlug: "green-herbal-hair-food-250g",
    rating: 4,
  },
];
