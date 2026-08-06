/**
 * Customer reviews. There are none, and that is the honest state.
 *
 * WHAT WAS HERE, AND WHY IT IS GONE
 *
 * Three written-to-design quotes with star ratings. They were clearly marked as
 * placeholders in this file and the component rendered a "sample content" label
 * next to them. Then the domain went live and they became three invented
 * customer reviews on the homepage of a trading business.
 *
 * The label did not save it. A shopper reads the quote and forms a belief; they
 * do not read the disclaimer and discount it. Fabricated reviews are unlawful
 * under consumer protection rules in essentially every market Efe would sell
 * into, and the risk sits with Efe, not with whoever wrote the placeholder.
 *
 * So the array is empty and stays empty until real reviews exist. The homepage
 * now runs `IngredientProof` instead, which makes a stronger argument out of
 * something entirely true.
 *
 * HOW TO FILL THIS PROPERLY
 *
 * 1. Put a short link or QR on the product label and on the order confirmation.
 * 2. Ask the stockists to pass on what customers tell them, with a name.
 * 3. Get explicit permission to publish the name before publishing it.
 *
 * Then add them below. The type is ready and nothing else needs changing.
 */

export type Testimonial = {
  quote: string;
  /** Real name, published with permission. Never invented, never "A. Customer". */
  name: string;
  role: string;
  /** Which product the review is about, links the quote to the catalogue. */
  productSlug?: string;
  rating: number;
  /** When it was given. Reviews without a date read as stock photography. */
  collectedAt: string;
};

/**
 * Empty on purpose. See above.
 *
 * If you are adding the first one: it must be something a real person actually
 * said about a product they actually bought, and they must know it is going on
 * the website.
 */
export const TESTIMONIALS: Testimonial[] = [];

export const HAS_REVIEWS = TESTIMONIALS.length > 0;
