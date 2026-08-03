/**
 * Single source of brand truth. No component hardcodes a brand string.
 * Values come from the brand deck ("Efe Organics Forward Presentation", 18 Jul 2026)
 * and the logo pack in /public/brand.
 */

export const brand = {
  name: "Efe Organics",
  legalName: "Efe Organics™",
  tagline: "Life & Organics",
  /** Deck cover line, used as the hero subhead. */
  promise: "Expanding horizons with nature in our everyday lives.",
  /** One-sentence description for metadata and social cards. */
  description:
    "Premium organic skin and hair care rooted in African tradition. Handcrafted African Black Soap, herbal hair care and natural body care, made in Ghana.",

  /**
   * The 2026 rebrand. Used on /about.
   *
   * Rewritten from the deck's original wording, which leaned on the sort of
   * phrasing every organic brand uses ("a bold step forward in our journey",
   * "a celebration of heritage, purity and the natural world"). It reads as
   * filler, and a shopper deciding between a GH₵15 bar and a competitor's does
   * not need it. Every sentence here says something a customer could check.
   */
  story: {
    heading: "How we got here",
    body: [
      "We changed our name from Efe Organic Cosmetics to Efe Organics in 2026. The range had grown past cosmetics into hair and body care, and the old name no longer covered it.",
      "We manufacture, market and sell organic skin and hair care rooted in African tradition, from Accra.",
      "Ingredients are sourced in Ghana and listed on the product pages, so you can read what is in something before you buy it.",
    ],
  },

  /** Deck slide 5. Order is deliberate. */
  values: [
    {
      title: "Authenticity",
      body: "Rooted in African heritage and genuinely organic ingredients.",
    },
    {
      title: "Sustainability",
      body: "Eco-friendly sourcing and packaging, by default.",
    },
    {
      title: "Health & wellness",
      body: "Chemical-free, nourishing formulations for every skin type.",
    },
    {
      title: "Community",
      body: "Supporting local farmers and ethical practices across Ghana.",
    },
  ],

  contact: {
    email: "hello@efeorganics.com",
    country: "Ghana",
    city: "Accra",
  },

  social: {
    handle: "@EfeOrganics",
    instagram: "https://instagram.com/efeorganics",
    facebook: "https://facebook.com/efeorganics",
    tiktok: "https://tiktok.com/@efeorganics",
  },

  /** Canonical origin. Update when the domain goes live. */
  url: "https://www.efeorganics.com",

  /** Where the catalogue currently lives, credited until we take over sales. */
  resellerUrl: "https://www.coloursbay.com",
} as const;

export const logos = {
  /** Green wordmark + leaf, horizontal. Best for headers on light surfaces. */
  horizontal: "/brand/logo-horizontal-leaf.jpg",
  /** Gold "Efe" monogram with leaf. Best on dark plates. */
  monogram: "/brand/logo-monogram-organics.jpg",
  /** Circular gold badge, legacy "Organic Cosmetics" mark. Archive use only. */
  badge: "/brand/logo-badge-cosmetics.jpg",
} as const;
