/**
 * Working out what a spreadsheet contains.
 *
 * WHY THIS IS A GUESS AND A FORM, NOT A PARSER
 *
 * The obvious approach is to write an Ecwid importer. It would be wrong within
 * a week: Ecwid lets you CHOOSE which columns to export, so two exports from
 * the same store can have different headers. And the file that actually turns
 * up from a business this size is as likely to be a spreadsheet somebody has
 * kept by hand.
 *
 * So this guesses, shows its work, and lets a human correct it. Auto-detection
 * gets the common cases right and the mapping form catches everything else,
 * which together handle Ecwid, Shopify, WooCommerce and a hand-typed sheet
 * without knowing anything about any of them.
 *
 * Confidence is reported rather than hidden. A mapping the code is unsure about
 * should look unsure, because the failure mode of a silent wrong guess is a
 * year of sales history landing in the wrong column.
 */

export type ImportEntity = "orders" | "customers" | "products";

export type FieldSpec = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Lowercased fragments that suggest a header maps here, best first. */
  aliases: string[];
};

/* -------------------------------------------------------------------------- */
/* What we can accept                                                         */
/* -------------------------------------------------------------------------- */

export const SCHEMAS: Record<
  ImportEntity,
  { label: string; blurb: string; fields: FieldSpec[] }
> = {
  orders: {
    label: "Past orders",
    blurb:
      "Sales history. This is the one that matters most, because almost every useful thing the shop can tell you later is calculated from it.",
    fields: [
      {
        key: "legacyReference",
        label: "Order number",
        hint: "The reference the old system used. Keeps a second import from duplicating everything.",
        required: true,
        aliases: ["order number", "order id", "order #", "invoice", "reference", "order"],
      },
      {
        key: "placedAt",
        label: "Order date",
        required: true,
        aliases: ["date placed", "order date", "created", "date", "placed"],
      },
      {
        key: "totalMinor",
        label: "Order total",
        required: true,
        aliases: ["order total", "total", "grand total", "amount"],
      },
      {
        key: "subtotalMinor",
        label: "Subtotal",
        hint: "Before delivery. Worked out from the total if missing.",
        aliases: ["subtotal", "sub total", "items total", "goods"],
      },
      {
        key: "deliveryMinor",
        label: "Delivery charge",
        // Specific first. "shipping" alone would otherwise claim "Shipping City".
        aliases: ["shipping cost", "delivery cost", "shipping", "delivery", "freight"],
      },
      {
        key: "discountMinor",
        label: "Discount",
        aliases: ["discount", "coupon", "reduction"],
      },
      {
        key: "customerName",
        label: "Customer name",
        aliases: ["customer name", "billing name", "name", "customer", "full name"],
      },
      {
        key: "customerEmail",
        label: "Customer email",
        hint: "Links orders to one customer record. Without it every order is a stranger.",
        aliases: ["email", "customer email", "e-mail", "billing email"],
      },
      {
        key: "customerPhone",
        label: "Customer phone",
        aliases: ["phone", "mobile", "telephone", "contact", "whatsapp"],
      },
      {
        key: "town",
        label: "Town or city",
        aliases: ["city", "town", "shipping city", "billing city"],
      },
      {
        key: "region",
        label: "Region",
        aliases: ["region", "state", "province", "shipping state"],
      },
      {
        key: "address",
        label: "Address",
        aliases: ["address", "street", "shipping address", "address line 1"],
      },
      {
        key: "status",
        label: "Status",
        hint: "Anything that reads as paid, shipped or delivered is treated as a completed sale.",
        aliases: ["status", "order status", "fulfillment", "payment status"],
      },
      {
        key: "itemsText",
        label: "What was bought",
        hint: "Free text is fine. Kept as a note on the order.",
        aliases: ["items", "products", "line items", "item name", "product name", "sku"],
      },
    ],
  },

  customers: {
    label: "Customers",
    blurb:
      "The mailing list and the phone book. Import this even if the orders are messy.",
    fields: [
      {
        key: "email",
        label: "Email",
        hint: "Used as the unique identifier. Rows without one are skipped.",
        required: true,
        aliases: ["email", "e-mail", "email address"],
      },
      { key: "name", label: "Name", aliases: ["name", "customer name", "full name", "contact"] },
      { key: "phone", label: "Phone", aliases: ["phone", "mobile", "telephone", "whatsapp"] },
      {
        key: "acceptsMarketing",
        label: "Agreed to marketing",
        hint: "Only import this if it was actually recorded. Do not assume yes.",
        aliases: ["accepts marketing", "subscribed", "newsletter", "marketing", "opt in"],
      },
      { key: "notes", label: "Notes", aliases: ["notes", "comment", "remark"] },
    ],
  },

  products: {
    label: "Products",
    blurb:
      "Names, prices and stock. The catalogue already exists, so this is mainly useful for correcting prices in bulk.",
    fields: [
      { key: "name", label: "Product name", required: true, aliases: ["name", "product name", "title", "item"] },
      { key: "sku", label: "SKU", aliases: ["sku", "code", "product code", "barcode"] },
      { key: "priceMinor", label: "Price", required: true, aliases: ["price", "unit price", "retail", "amount"] },
      { key: "compareAtMinor", label: "Was price", aliases: ["compare at", "rrp", "list price", "was", "old price"] },
      { key: "stockQty", label: "Stock", aliases: ["stock", "quantity", "qty", "inventory", "in stock"] },
      { key: "sizeLabel", label: "Size", aliases: ["size", "variant", "option", "volume", "weight"] },
      { key: "blurb", label: "Description", aliases: ["description", "blurb", "summary", "details"] },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Detection                                                                  */
/* -------------------------------------------------------------------------- */

const normalise = (header: string) =>
  header.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Scores one header against one field.
 *
 * Exact match beats "header contains alias" beats "alias contains header", and
 * earlier aliases score higher than later ones. That ordering is what stops
 * "Customer Email" from being claimed by the plain `name` field just because
 * both mention a customer.
 */
function score(header: string, field: FieldSpec): number {
  const h = normalise(header);
  if (!h) return 0;

  let best = 0;
  for (const [index, alias] of field.aliases.entries()) {
    // Position is a tie-breaker between equally good matches, never enough to
    // beat a better kind of match. An earlier version let a broad alias at
    // position 0 outscore an exact hit at position 2, which mapped "Shipping
    // City" to the delivery charge and put a town name in a money column.
    const rank = 0.9 + 0.1 * (1 - index / field.aliases.length);

    let raw = 0;
    if (h === alias) {
      raw = 100;
    } else if (h.includes(alias)) {
      // Scaled by how much of the header the alias accounts for, so the longer
      // and more specific alias wins: "shipping cost" explains all of
      // "Shipping Cost", "shipping" explains only part of it.
      raw = 60 * (alias.length / h.length);
    } else if (alias.includes(h) && h.length > 3) {
      raw = 35 * (h.length / alias.length);
    }

    best = Math.max(best, raw * rank);
  }
  return best;
}

export type Mapping = Record<string, number | null>;

export type Detection = {
  entity: ImportEntity;
  mapping: Mapping;
  /** 0 to 1. How much of the required set was matched confidently. */
  confidence: number;
};

/** Best mapping of headers onto one entity's fields. Each column used once. */
function mapTo(headers: string[], entity: ImportEntity): Detection {
  const { fields } = SCHEMAS[entity];
  const mapping: Mapping = {};
  const taken = new Set<number>();

  // Every plausible pairing, strongest first, so a strong match claims its
  // column before a weaker field can take it.
  const pairs: Array<{ field: string; column: number; value: number }> = [];
  for (const field of fields) {
    headers.forEach((header, column) => {
      const value = score(header, field);
      if (value > 0) pairs.push({ field: field.key, column, value });
    });
  }
  pairs.sort((a, b) => b.value - a.value);

  for (const pair of pairs) {
    if (mapping[pair.field] != null || taken.has(pair.column)) continue;
    mapping[pair.field] = pair.column;
    taken.add(pair.column);
  }
  for (const field of fields) {
    if (mapping[field.key] === undefined) mapping[field.key] = null;
  }

  const required = fields.filter((f) => f.required);
  const matched = required.filter((f) => mapping[f.key] != null).length;
  const complete = required.length ? matched / required.length : 0;

  /*
    HOW MUCH OF THE FILE DOES THIS SCHEMA EXPLAIN?

    Scoring only on "did the schema get its required fields" is what an earlier
    version did, and it classified a full order export as a customer list. The
    customers schema needs exactly one column, an email, and an order export has
    one, so it scored a perfect 1.0 while explaining four of nine columns.

    Coverage is the discriminator. Read as orders, that file explains all nine
    columns; read as customers it cannot account for "Date Placed" or "Order
    Total" at all. The schema that leaves the least unexplained is the right one.
  */
  const coverage = headers.length ? taken.size / headers.length : 0;

  // Missing a required column is disqualifying rather than merely costly, so a
  // partial match can never outscore a complete one on coverage alone.
  const confidence = complete < 1 ? complete * 0.35 * coverage : 0.5 + 0.5 * coverage;

  return { entity, mapping, confidence };
}

/** Guesses what the file is, and how each column should be read. */
export function detect(headers: string[]): Detection {
  const candidates = (Object.keys(SCHEMAS) as ImportEntity[]).map((entity) =>
    mapTo(headers, entity),
  );
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
}

/** Re-runs the mapping for one entity, for when the guess is overridden. */
export function mapForEntity(
  headers: string[],
  entity: ImportEntity,
): Detection {
  return mapTo(headers, entity);
}
