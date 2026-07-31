/**
 * Single source of brand truth. No component hardcodes a brand string.
 * Values come from the brand deck ("Efe Organics Forward Presentation", 18 Jul 2026)
 * and the logo pack in /public/brand.
 */

export const brand = {
  name: "Efe Organics",
  legalName: "Efe Organics™",
  tagline: "Life & Organics",
  /** Deck cover line — used as the hero subhead. */
  promise: "Expanding horizons with nature in our everyday lives.",
  /** One-sentence description for metadata and social cards. */
  description:
    "Premium organic skin and hair care rooted in African tradition. Handcrafted African Black Soap, herbal hair care and natural body care, made in Ghana.",

  /** The 2026 rebrand, straight from the deck. Used on /about. */
  story: {
    heading: "Our evolution",
    body: [
      "In 2026 we rebranded from Efe Organic Cosmetics to Efe Organics — a bold step forward in our journey to serve a wider organics market.",
      "Our mission is to manufacture, market and sell the finest organic skin and hair care products rooted deeply in African tradition. Every product we create is a celebration of heritage, purity and the natural world.",
      "Quality, authenticity and sustainability are not just values — they are our foundation. We source ethically, formulate consciously, and deliver products that honour both the people who use them and the earth that provides them.",
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

  /** Where the catalogue currently lives — credited until we take over sales. */
  resellerUrl: "https://www.coloursbay.com",
} as const;

export const logos = {
  /** Green wordmark + leaf, horizontal. Best for headers on light surfaces. */
  horizontal: "/brand/logo-horizontal-leaf.jpg",
  /** Gold "Efe" monogram with leaf. Best on dark plates. */
  monogram: "/brand/logo-monogram-organics.jpg",
  /** Circular gold badge — legacy "Organic Cosmetics" mark. Archive use only. */
  badge: "/brand/logo-badge-cosmetics.jpg",
} as const;
