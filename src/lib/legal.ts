import { brand } from "@/lib/brand";

/**
 * Policy content.
 *
 * READ THIS BEFORE THE SHOP TAKES MONEY.
 *
 * These are drafts written from how the shop actually behaves, not legal advice
 * and not reviewed by anybody qualified. They exist because a shop with no
 * policies at all is worse than one with honest drafts: a customer needs to know
 * what happens if a delivery goes missing, and Ghana's Data Protection Act 2012
 * expects a business holding personal data to say what it does with it.
 *
 * WHAT IS DELIBERATELY MISSING
 *
 * No returns window in days, no refund timescale, no guarantee. Nobody has told
 * us what Efe actually offers, and inventing a fourteen-day returns policy would
 * commit the business to terms it never agreed to. Where a number is unknown the
 * text says the business will confirm it, which is both true and the current
 * process.
 *
 * `NEEDS_REVIEW` drives a visible banner. It should stay true until a person who
 * knows Ghanaian consumer and data protection law has read these.
 */

export const NEEDS_REVIEW = true;

/** Blank until Efe registers with the Data Protection Commission. */
export const DATA_CONTROLLER_REGISTRATION = "";

export type PolicySection = { heading: string; body: string[] };

export type Policy = {
  slug: string;
  title: string;
  intro: string;
  sections: PolicySection[];
};

const contact = `${brand.contact.email}`;

export const POLICIES: Policy[] = [
  {
    slug: "terms",
    title: "Terms of sale",
    intro:
      "The basis on which we sell. Written plainly, because terms nobody can read protect nobody.",
    sections: [
      {
        heading: "Who you are buying from",
        body: [
          `${brand.legalName}, based in ${brand.contact.city}, ${brand.contact.country}. You can reach us at ${contact}.`,
        ],
      },
      {
        heading: "Placing an order",
        body: [
          "An order placed on this site is a request to buy, not a completed sale. We confirm it with you, agree the delivery charge for your town, and only then is there a total to pay.",
          "Nothing is charged at the moment you place an order. If we cannot fulfil something, we will tell you and you will not be charged for it.",
        ],
      },
      {
        heading: "Prices",
        body: [
          "Prices are in Ghana cedis and include any tax we are required to charge. Delivery is quoted separately because it depends on where you are.",
          "We may change prices, but never after we have confirmed an order with you.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "We accept mobile money and card. Payment is taken after we have confirmed your order and its total.",
        ],
      },
      {
        heading: "Our products",
        body: [
          "We make organic skin and hair care. Our products are cosmetics, not medicines. Nothing we sell is intended to diagnose, treat, cure or prevent any condition, and nothing on this site should be read as saying otherwise.",
          "Ingredients are listed on each product page. If you have a known sensitivity, read the list before buying and patch test first.",
        ],
      },
      {
        heading: "If something is wrong",
        body: [
          "Contact us and we will put it right. Your rights under Ghanaian consumer law are not affected by anything written here.",
        ],
      },
    ],
  },

  {
    slug: "privacy",
    title: "Privacy",
    intro:
      "What we collect, why, and what we do not do. Short, because we collect very little.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "When you place an order: your name, email, phone number and delivery address. We need these to deliver to you and to talk to you about your order.",
          "When you browse: which pages were visited and in what order, tied to a random identifier stored in your browser. This is first party, meaning it stays with us.",
        ],
      },
      {
        heading: "What we do not collect",
        body: [
          "We do not store your IP address or your browser's user agent. We do not use third-party analytics, advertising trackers or social media pixels. We never see or store your card or mobile money details; those go directly to the payment provider.",
        ],
      },
      {
        heading: "Marketing",
        body: [
          "We only send marketing to people who have agreed to receive it. Agreeing is a separate, deliberate act, never a pre-ticked box or a consequence of placing an order. You can tell us to stop at any time and we will.",
        ],
      },
      {
        heading: "Who else sees it",
        body: [
          "Our payment provider, so you can pay. Whoever delivers your order, so it reaches you. Our hosting and database providers, who store the data on our behalf. Nobody else, and we do not sell data to anyone.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Order records are kept for as long as we are required to keep business records. You can ask us to delete anything we are not obliged to keep.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `Under Ghana's Data Protection Act 2012 you can ask what we hold about you, ask us to correct it, and ask us to delete it. Write to ${contact} and we will respond.`,
          DATA_CONTROLLER_REGISTRATION
            ? `We are registered as a data controller with the Data Protection Commission, registration ${DATA_CONTROLLER_REGISTRATION}.`
            : "Our registration with the Data Protection Commission is in progress.",
        ],
      },
    ],
  },

  {
    slug: "returns",
    title: "Returns",
    intro: "What happens if a product is not right.",
    sections: [
      {
        heading: "Damaged, wrong or faulty",
        body: [
          `Tell us within a reasonable time of receiving it and send a photograph if you can. We will replace it or refund it. Write to ${contact} with your order reference.`,
          "You will not be out of pocket for returning something that was our mistake.",
        ],
      },
      {
        heading: "Changed your mind",
        body: [
          "Get in touch and we will do what we reasonably can. Because these are cosmetics and personal care products, we cannot resell an item once it has been opened or used, for hygiene reasons. Unopened items in their original packaging are a different matter.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Refunds go back the way you paid. We will confirm the timescale when we agree the refund, as it depends on your payment method.",
        ],
      },
      {
        heading: "A note on reactions",
        body: [
          "Our products are made from natural ingredients, and natural does not mean nobody reacts to it. If a product does not agree with your skin, stop using it and contact us. We will treat it as a fault.",
        ],
      },
    ],
  },

  {
    slug: "delivery",
    title: "Delivery",
    intro: "How your order reaches you, and what it costs.",
    sections: [
      {
        heading: "Where we deliver",
        body: [
          "Across Ghana. Tell us your region and town at checkout and we will confirm the charge.",
        ],
      },
      {
        heading: "What it costs",
        body: [
          "Delivery is quoted per order, because the cost depends on where you are. For some regions we have an agreed rate and checkout will show it straight away. For the rest we confirm the charge with you before taking payment.",
          "We would rather tell you the real figure than show you an estimate and change it afterwards.",
        ],
      },
      {
        heading: "How long it takes",
        body: [
          "We confirm the expected time when we confirm your order. It depends on your region and the courier.",
        ],
      },
      {
        heading: "If it does not arrive",
        body: [
          `Contact us at ${contact} with your order reference and we will chase it. If it is lost, we will replace it or refund you.`,
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((policy) => policy.slug === slug);
}
