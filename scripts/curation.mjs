/**
 * Curation map: reseller slug → Efe's own taxonomy.
 *
 * The reseller's own categories are not usable, 22 products sit in `bodycare`
 * (including every black soap bath) while `african-black-soap` holds 2, and it
 * carries both `bodycare` and `body-care` as separate slugs. So the scrape
 * supplies facts (name, price, copy, ingredients, imagery) and this file owns
 * meaning (category, line, size, variant grouping, our own slug).
 *
 * `group` is the important one: it collapses 42 SKUs into ~26 buying decisions
 * by turning "Lemon Blast 350ml / 500ml / 1L" into one product with a size
 * selector, the upsell identified in the transformation brief.
 */

export const CURATION = {
  // --- African Black Soap: the flagship line ------------------------------
  "african-black-soap-bar": {
    slug: "african-black-soap-bath-bar",
    category: "black-soap",
    line: "flagship",
    sizeG: 200,
  },
  "blossom-350ml": {
    slug: "blossoms-black-soap-bath-350ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 350,
    group: "blossoms-black-soap-bath",
  },
  "blossom-2-1l": {
    slug: "blossoms-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
    group: "blossoms-black-soap-bath",
  },
  "tropical-sunrise-350ml": {
    slug: "tropical-sunrise-black-soap-bath-350ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 350,
    group: "tropical-sunrise-black-soap-bath",
  },
  "tropical-sunrise-2-1l": {
    slug: "tropical-sunrise-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
    group: "tropical-sunrise-black-soap-bath",
  },
  "sweet-lavender-350ml": {
    slug: "sweet-lavender-black-soap-bath-350ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 350,
    group: "sweet-lavender-black-soap-bath",
  },
  "sweet-lavender-2-1l": {
    slug: "sweet-lavender-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
    group: "sweet-lavender-black-soap-bath",
  },
  "lemon-blast-gel-350ml": {
    slug: "lemon-blast-black-soap-bath-350ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 350,
    group: "lemon-blast-black-soap-bath",
  },
  "lemon-blast-3-500ml": {
    slug: "lemon-blast-black-soap-bath-500ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 500,
    group: "lemon-blast-black-soap-bath",
  },
  "lemon-blast-2-1l": {
    slug: "lemon-blast-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
    group: "lemon-blast-black-soap-bath",
  },
  "cool-herbal-350ml": {
    slug: "cool-herbal-black-soap-bath-350ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 350,
    group: "cool-herbal-black-soap-bath",
  },
  "cool-herbal-2-1l": {
    slug: "cool-herbal-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
    group: "cool-herbal-black-soap-bath",
  },
  "honey-goat-milk-2-1l": {
    slug: "honey-goat-milk-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
  },
  "organic-gentle-glow-350ml": {
    slug: "organic-gentle-glow-black-soap-bath-350ml",
    category: "black-soap",
    line: "flagship",
    sizeMl: 350,
    group: "organic-gentle-glow-black-soap-bath",
  },
  "organic-gentle-glow-1l": {
    slug: "organic-gentle-glow-black-soap-bath-1l",
    category: "black-soap",
    line: "flagship",
    sizeMl: 1000,
    group: "organic-gentle-glow-black-soap-bath",
  },

  // Raw material, sold by the quarter-tonne. Not a consumer product, it is
  // hidden from the shop and surfaced on the wholesale page instead.
  "pure-african-black-soap-crumble-250kgs": {
    slug: "african-black-soap-crumble-250kg",
    category: "black-soap",
    line: "flagship",
    wholesale: true,
    sizeG: 250_000,
  },

  // --- Hair Care ----------------------------------------------------------
  "herbal-hair-shampoo-350ml": {
    slug: "herbal-hair-shampoo-350ml",
    category: "hair-care",
    line: "flagship",
    sizeMl: 350,
    group: "herbal-hair-shampoo",
  },
  "herbal-hair-shampoo-500ml": {
    slug: "herbal-hair-shampoo-500ml",
    category: "hair-care",
    line: "flagship",
    sizeMl: 500,
    group: "herbal-hair-shampoo",
  },
  "herbal-hair-shampoo-1l": {
    slug: "herbal-hair-shampoo-1l",
    category: "hair-care",
    line: "flagship",
    sizeMl: 1000,
    group: "herbal-hair-shampoo",
  },
  "anti-dandruff-shampoo-350ml": {
    slug: "anti-dandruff-shampoo-350ml",
    category: "hair-care",
    line: "supporting",
    sizeMl: 350,
    group: "anti-dandruff-shampoo",
  },
  "anti-dandruff-shampoo-500ml": {
    slug: "anti-dandruff-shampoo-500ml",
    category: "hair-care",
    line: "supporting",
    sizeMl: 500,
    group: "anti-dandruff-shampoo",
  },
  "anti-dandruff-shampoo-1l": {
    slug: "anti-dandruff-shampoo-1l",
    category: "hair-care",
    line: "supporting",
    sizeMl: 1000,
    group: "anti-dandruff-shampoo",
  },
  "green-herbal-hair-food": {
    slug: "green-herbal-hair-food-250g",
    category: "hair-care",
    line: "supporting",
    sizeG: 250,
  },
  "green-herbal-rice-water-spray": {
    slug: "green-herbal-rice-water-spray-500ml",
    category: "hair-care",
    line: "supporting",
    sizeMl: 500,
  },
  "green-herbal-wash-out-conditioner": {
    slug: "green-herbal-wash-out-conditioner-500ml",
    category: "hair-care",
    line: "supporting",
    sizeMl: 500,
  },
  "green-herbal-leave-in-conditioner": {
    slug: "green-herbal-leave-in-conditioner-500ml",
    category: "hair-care",
    line: "supporting",
    sizeMl: 500,
  },
  "green-herbal-deep-conditioner": {
    slug: "green-herbal-deep-conditioning-cream-500g",
    category: "hair-care",
    line: "supporting",
    sizeG: 500,
  },
  "green-herbal-twist-curl-custard": {
    slug: "green-herbal-twist-curl-custard-250g",
    category: "hair-care",
    line: "supporting",
    sizeG: 250,
  },

  // --- Body Care ----------------------------------------------------------
  "gentle-aloe-milk-350ml": {
    slug: "gentle-aloe-milk-350ml",
    category: "body-care",
    line: "supporting",
    sizeMl: 350,
    group: "gentle-aloe-milk",
  },
  "gentle-aloe-milk-1l": {
    slug: "gentle-aloe-milk-1l",
    category: "body-care",
    line: "supporting",
    sizeMl: 1000,
    group: "gentle-aloe-milk",
  },
  "soothing-lavender-milk-350ml": {
    slug: "soothing-lavender-milk-350ml",
    category: "body-care",
    line: "supporting",
    sizeMl: 350,
    group: "soothing-lavender-milk",
  },
  "soothing-lavender-milk-1l": {
    slug: "soothing-lavender-milk-1l",
    category: "body-care",
    line: "supporting",
    sizeMl: 1000,
    group: "soothing-lavender-milk",
  },
  "unscented-2-1l": {
    slug: "unscented-hair-body-gel-1l",
    category: "body-care",
    line: "supporting",
    sizeMl: 1000,
  },

  // --- Lotions & Butters --------------------------------------------------
  "pure-shea-butter-250g": {
    slug: "pure-african-shea-butter-250g",
    category: "lotions-butters",
    line: "supporting",
    sizeG: 250,
  },
  "organic-body-butter": {
    slug: "efes-organic-body-butter",
    category: "lotions-butters",
    line: "supporting",
  },
  "shea-avoco-body-lotion": {
    slug: "shea-avoco-body-lotion",
    category: "lotions-butters",
    line: "supporting",
  },
  "rose-roselle-glow-lotion": {
    slug: "rose-roselle-glow-lotion",
    category: "lotions-butters",
    line: "supporting",
  },
  "carrot-aloe-glow-butter": {
    slug: "carrot-aloe-glow-butter",
    category: "lotions-butters",
    line: "supporting",
  },

  // --- Skincare -----------------------------------------------------------
  "acne-blemish-cleanser-350ml": {
    slug: "acne-blemish-cleanser-350ml",
    category: "skincare",
    line: "supporting",
    sizeMl: 350,
    group: "acne-blemish-cleanser",
  },
  "acne-blemish-cleanser-1l": {
    slug: "acne-blemish-cleanser-1l",
    category: "skincare",
    line: "supporting",
    sizeMl: 1000,
    group: "acne-blemish-cleanser",
  },

  // --- Oils ---------------------------------------------------------------
  "carrot-face-body-oil-100ml": {
    slug: "carrot-face-body-oil-100ml",
    category: "oils",
    line: "supporting",
    sizeMl: 100,
  },
  "green-herbal-scalp-oil-120ml": {
    slug: "green-herbal-hair-scalp-oil-120ml",
    category: "oils",
    line: "supporting",
    sizeMl: 120,
  },
};
