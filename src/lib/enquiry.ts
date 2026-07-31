/**
 * Enquiry scripts.
 *
 * A conversation is defined as DATA, not markup, so the trade and general flows
 * are the same component with different scripts — and so a step can branch on an
 * earlier answer without rewriting the UI.
 *
 * Design rules for writing a step:
 *   · One question per step. Two questions in one bubble is a form again.
 *   · Ask the easy, low-commitment things first (what do you need) and personal
 *     details last (phone, email). Someone three answers deep is far more likely
 *     to give a phone number than someone on question one.
 *   · Choices beat typing on a phone. Reach for `choice` unless the answer is
 *     genuinely open.
 */

export type StepKind = "choice" | "text" | "email" | "tel" | "long";

export type EnquiryStep = {
  id: string;
  /** What Efe "says". Keep it human — this is read as speech. */
  prompt: string;
  /** Optional supporting line under the prompt. */
  hint?: string;
  kind: StepKind;
  options?: string[];
  placeholder?: string;
  optional?: boolean;
  /**
   * Show this step only when an earlier answer matches. Declarative DATA, not a
   * predicate function — the script is defined in a server component and handed
   * to a client one, and functions cannot cross that boundary. A `when: () =>`
   * callback here failed the production build with "Functions cannot be passed
   * directly to Client Components", which dev mode never surfaced.
   */
  showIf?: { field: string; equals: string | string[] };
};

export type EnquiryScript = {
  /** Opening line, before the first question. */
  greeting: string;
  steps: EnquiryStep[];
  /** Shown on the review screen above the summary. */
  closing: string;
};

/* -------------------------------------------------------------------------- */

export const TRADE_SCRIPT: EnquiryScript = {
  greeting:
    "Let's work out what you need. Six quick questions — under a minute.",
  steps: [
    {
      id: "business_type",
      prompt: "First — what kind of business are you?",
      kind: "choice",
      options: [
        "Shop or pharmacy",
        "Salon or spa",
        "Market trader",
        "Formulator or manufacturer",
        "Distributor",
        "Something else",
      ],
    },
    {
      id: "interest",
      prompt: "And what are you looking to buy?",
      hint: "You can change your mind later — this just points us the right way.",
      kind: "choice",
      options: [
        "The retail range",
        "1L professional formats",
        "Raw black soap crumble",
        "Not sure yet — advise me",
      ],
    },
    {
      id: "volume",
      prompt: "Roughly what volume, and how often?",
      hint: "A rough figure is fine. It decides which price tier you fall into.",
      kind: "choice",
      options: [
        "A trial order first",
        "Monthly restock",
        "Weekly / high volume",
        "One-off bulk purchase",
      ],
    },
    {
      id: "location",
      prompt: "Where are you based?",
      kind: "text",
      placeholder: "Accra, Kumasi, Lagos…",
    },
    {
      id: "name",
      prompt: "Almost there. What should we call you?",
      kind: "text",
      placeholder: "Your name",
    },
    {
      id: "business_name",
      prompt: "And the business name?",
      kind: "text",
      placeholder: "Trading name",
      optional: true,
    },
    {
      id: "phone",
      prompt: "Best number to reach you on?",
      hint: "WhatsApp is usually fastest.",
      kind: "tel",
      placeholder: "024 000 0000",
    },
    {
      id: "email",
      prompt: "And an email for the price list?",
      kind: "email",
      placeholder: "you@business.com",
    },
    {
      id: "notes",
      prompt: "Anything else we should know?",
      kind: "long",
      placeholder: "Specific products, timelines, questions…",
      optional: true,
    },
  ],
  closing:
    "That's everything. We'll come back with pricing and terms — usually within a working day.",
};

export const CONTACT_SCRIPT: EnquiryScript = {
  greeting: "Hello. Tell us what's on your mind and we'll point it the right way.",
  steps: [
    {
      id: "topic",
      prompt: "What can we help with?",
      kind: "choice",
      options: [
        "A question about a product",
        "An order I've placed",
        "Stocking Efe in my shop",
        "Press or partnership",
        "Something else",
      ],
    },
    {
      id: "order_ref",
      prompt: "Do you have an order reference?",
      hint: "It looks like EFE-XXXXX-XXXX. Skip if you don't have it to hand.",
      kind: "text",
      placeholder: "EFE-…",
      optional: true,
      // Only asked when it could possibly be relevant.
      showIf: { field: "topic", equals: "An order I've placed" },
    },
    {
      id: "message",
      prompt: "Go ahead — what would you like to say?",
      kind: "long",
      placeholder: "Type as much or as little as you like…",
    },
    {
      id: "name",
      prompt: "Who are we speaking with?",
      kind: "text",
      placeholder: "Your name",
    },
    {
      id: "email",
      prompt: "Where should we reply?",
      kind: "email",
      placeholder: "you@example.com",
    },
    {
      id: "phone",
      prompt: "A phone or WhatsApp number, if you'd rather we call?",
      kind: "tel",
      placeholder: "024 000 0000",
      optional: true,
    },
  ],
  closing: "Thanks. We read everything and usually reply within a working day.",
};

/** Steps that apply given the answers so far — resolves `showIf` branches. */
export function visibleSteps(
  script: EnquiryScript,
  answers: Record<string, string>,
): EnquiryStep[] {
  return script.steps.filter((step) => {
    if (!step.showIf) return true;
    const value = answers[step.showIf.field];
    const { equals } = step.showIf;
    return Array.isArray(equals) ? equals.includes(value) : value === equals;
  });
}

/** Human-readable label for a step, used in the review list and the email. */
export function labelFor(step: EnquiryStep): string {
  return step.prompt.replace(/^(First — |And |Almost there\. )/, "").replace(/\?$/, "");
}
