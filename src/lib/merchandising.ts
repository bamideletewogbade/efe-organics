/**
 * Editorial ordering for the shop. What gets promoted, and why.
 *
 * ⚠️ `BESTSELLER_KEYS` is a DERIVED default, not sales data. Efe has no order
 * history on our side yet, and the reseller reports zero reviews and no
 * bestseller flags on any SKU.
 *
 * The proxy used is **size-family breadth**: a product Efe manufactures in
 * three formats (350ml / 500ml / 1L) is one the business has committed a
 * production line to, which is a far better signal than picking at random. Ties
 * break toward the flagship black soap line.
 *
 * This is a stand-in for one question to the owner, "which four sell most?",
 * after which this list becomes fact. Once checkout is live (Phase 3) it should
 * be computed from real orders instead. Tracked in docs/OPEN-QUESTIONS.md.
 */

export const BESTSELLERS_ARE_DERIVED = true;

/** Group keys from `listShelf()`. Order is the display order. */
export const BESTSELLER_KEYS = [
  "lemon-blast-black-soap-bath", // 3 sizes, the widest ladder in the range
  "herbal-hair-shampoo", // 3 sizes, the hair-care flagship
  "anti-dandruff-shampoo", // 3 sizes
  "african-black-soap-bath-bar", // the GH₵15 entry product, the range's front door
] as const;
