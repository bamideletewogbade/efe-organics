/**
 * Database schema, the backend Efe owns.
 *
 * Built to replace a rented storefront admin, so it has to cover what that
 * admin does: catalogue, stock, pricing rules, orders, customers, and enough
 * analytics to answer "how is the shop doing" without exporting anything.
 *
 * FIVE RULES THIS SCHEMA HOLDS TO
 *
 * 1. **Money is integer minor units (pesewas).** Never a float, never a decimal
 *    string in application code. `bigint` because a quarter-tonne of soap at
 *    GH₵13,750 is 1,375,000 pesewas and bulk orders multiply.
 *
 * 2. **Product ≠ variant.** The imported catalogue flattened both into 42 rows
 *    with a `group` string, which is why "Lemon Blast 350ml/500ml/1L" needed a
 *    hack to display as one card. Here a product is the shelf entry and a
 *    variant is the sellable SKU that carries price and stock. This is the model
 *    every real store converges on.
 *
 * 3. **Orders snapshot their lines.** An order row copies the name and price at
 *    the time of purchase. Joining to live products would silently rewrite
 *    history the first time someone edits a price, the single most common
 *    e-commerce data bug.
 *
 * 4. **Nothing is hard-deleted.** Products archive, orders cancel, discounts
 *    expire. A shop owner who deletes a product still needs last year's orders
 *    to make sense.
 *
 * 5. **Every mutation is attributable.** `audit_log` records who changed what.
 *    That matters the moment more than one person has admin access.
 */

import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Raw bytes. Drizzle has no built-in bytea, so it is declared here.
 *
 * Used to keep uploaded documents in Postgres rather than object storage. At
 * Efe's scale that is a handful of price lists and certificates, and putting
 * them in the database means the whole feature ships today instead of waiting
 * on a Vercel Blob or Cloudflare R2 decision that nobody has made. The cost is
 * that backups get bigger and very large files are a bad idea, so uploads are
 * capped and the column can be swapped for a URL later without touching the
 * rest of the schema.
 */
const bytea = customType<{ data: Buffer; default: false }>({
  dataType: () => "bytea",
});

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const productStatus = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const productLine = pgEnum("product_line", ["flagship", "supporting"]);

/** Where a variant is sold. Keeps the 250kg crumble off the consumer shelf. */
export const salesChannel = pgEnum("sales_channel", [
  "retail",
  "trade",
  "both",
]);

export const discountKind = pgEnum("discount_kind", [
  "percentage",
  "fixed_amount",
]);

export const discountScope = pgEnum("discount_scope", [
  "variant",
  "product",
  "category",
  "order",
]);

export const orderStatus = pgEnum("order_status", [
  "pending", // placed, awaiting confirmation/payment
  "confirmed", // total agreed with customer
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "authorized",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
]);

/** Why stock moved. An audit trail for inventory, not just a number. */
export const stockReason = pgEnum("stock_reason", [
  "manual_adjustment",
  "order_placed",
  "order_cancelled",
  "restock",
  "damage",
  "return",
]);

export const adminRole = pgEnum("admin_role", ["owner", "manager", "staff"]);

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    blurb: text("blurb"),
    /** Manual merchandising order. Lower sorts first. */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 240 }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    line: productLine("line").notNull().default("supporting"),
    status: productStatus("status").notNull().default("draft"),

    blurb: text("blurb"),
    description: text("description"),
    /** Present for 38 of 42 imported SKUs, the factual base for AI copy. */
    ingredients: text("ingredients"),
    howToUse: text("how_to_use"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),

    /** Merchandising flags the admin can toggle. Not derived, not guessed. */
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    index("products_category_idx").on(table.categoryId),
    index("products_status_idx").on(table.status),
  ],
);

/**
 * The sellable unit. Price and stock live HERE, never on the product.
 */
export const variants = pgTable(
  "variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    /** Stable public identifier, also the URL segment. */
    slug: varchar("slug", { length: 180 }).notNull(),
    sku: varchar("sku", { length: 64 }),
    /** Display label for the size selector: "350ml", "1L", "250g". */
    sizeLabel: varchar("size_label", { length: 48 }),
    sizeMl: integer("size_ml"),
    sizeG: integer("size_g"),

    priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
    /** RRP for the strike-through. Null when there is no discount to show. */
    compareAtMinor: bigint("compare_at_minor", { mode: "number" }),
    /** What it costs Efe to make. Admin-only, powers margin reporting. */
    costMinor: bigint("cost_minor", { mode: "number" }),

    channel: salesChannel("channel").notNull().default("retail"),

    /* --- inventory --- */
    stockQty: integer("stock_qty").notNull().default(0),
    /** At or below this, the storefront says "only N left". */
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    /** When false, stock is not enforced (made to order, raw material). */
    trackStock: boolean("track_stock").notNull().default(true),
    allowBackorder: boolean("allow_backorder").notNull().default(false),

    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("variants_slug_idx").on(table.slug),
    index("variants_product_idx").on(table.productId),
    index("variants_stock_idx").on(table.stockQty),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Null = belongs to the product; set = specific to one size. */
    variantId: uuid("variant_id").references(() => variants.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 240 }),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("product_images_product_idx").on(table.productId)],
);

/** Every stock movement, with a reason. Answers "where did 20 bars go?" */
export const stockLedger = pgTable(
  "stock_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    /** Signed: -3 sold, +50 restocked. */
    delta: integer("delta").notNull(),
    reason: stockReason("reason").notNull(),
    /** Order id, admin id, or a free note. */
    reference: varchar("reference", { length: 160 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("stock_ledger_variant_idx").on(table.variantId)],
);

/* -------------------------------------------------------------------------- */
/* Pricing: discounts and bundles                                             */
/* -------------------------------------------------------------------------- */

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    kind: discountKind("kind").notNull(),
    scope: discountScope("scope").notNull(),

    /** Percentage: 0-100. Fixed: minor units off. */
    value: integer("value").notNull(),

    /** Null for an automatic discount; set for a code the customer enters. */
    code: varchar("code", { length: 48 }),

    /** Which thing the scope points at. Null when scope is `order`. */
    targetId: uuid("target_id"),

    /** Order-level conditions. */
    minSubtotalMinor: bigint("min_subtotal_minor", { mode: "number" }),
    minQuantity: integer("min_quantity"),

    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("discounts_code_idx").on(table.code),
    index("discounts_active_idx").on(table.active),
  ],
);

/**
 * A fixed set of variants sold together for one price.
 *
 * Separate from `discounts` on purpose: a bundle is a THING a customer buys
 * ("Black Soap Starter Set"), with its own name and image, not a rule applied
 * to a basket. Conflating them makes both harder to reason about.
 */
export const bundles = pgTable(
  "bundles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 240 }).notNull(),
    blurb: text("blurb"),
    imageUrl: text("image_url"),
    /** Null = sum of parts minus `discountPercent`. Set = flat price. */
    priceMinor: bigint("price_minor", { mode: "number" }),
    discountPercent: integer("discount_percent"),
    active: boolean("active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("bundles_slug_idx").on(table.slug)],
);

export const bundleItems = pgTable(
  "bundle_items",
  {
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundles.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.bundleId, table.variantId] })],
);

/* -------------------------------------------------------------------------- */
/* Customers and orders                                                       */
/* -------------------------------------------------------------------------- */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 240 }).notNull(),
    name: varchar("name", { length: 200 }),
    phone: varchar("phone", { length: 40 }),
    /** Marketing consent. Recorded, not assumed. */
    acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("customers_email_idx").on(table.email)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Human-quotable: EFE-4K2P9-A7QX. Read over the phone. */
    reference: varchar("reference", { length: 32 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.id),

    status: orderStatus("status").notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),

    subtotalMinor: bigint("subtotal_minor", { mode: "number" }).notNull(),
    discountMinor: bigint("discount_minor", { mode: "number" })
      .notNull()
      .default(0),
    /** Null until quoted, delivery rates are confirmed with the customer. */
    deliveryMinor: bigint("delivery_minor", { mode: "number" }),

    /**
     * Tax charged, and the rate it was charged at.
     *
     * Both are here BEFORE anyone knows whether Efe is VAT registered, because
     * adding tax columns after real orders exist means backfilling history you
     * can no longer reconstruct. Zero and null are the honest values for "we did
     * not charge tax", and they cost nothing.
     *
     * The rate is stored per order in basis points rather than read from
     * settings at report time: rates change, and an invoice from last year has
     * to still say what was actually charged. 1500 = 15.0%.
     */
    taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
    taxRateBp: integer("tax_rate_bp"),

    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("GHS"),

    /** Snapshot. A customer moving house must not rewrite past orders. */
    deliveryName: varchar("delivery_name", { length: 200 }),
    deliveryPhone: varchar("delivery_phone", { length: 40 }),
    deliveryEmail: varchar("delivery_email", { length: 240 }),
    deliveryRegion: varchar("delivery_region", { length: 80 }),
    deliveryTown: varchar("delivery_town", { length: 120 }),
    deliveryAddress: text("delivery_address"),
    customerNote: text("customer_note"),
    internalNote: text("internal_note"),

    discountId: uuid("discount_id").references(() => discounts.id),
    paystackReference: varchar("paystack_reference", { length: 120 }),
    momoReference: varchar("momo_reference", { length: 120 }),

    /**
     * Set when the order came from a spreadsheet rather than the checkout.
     *
     * `legacyReference` is the order number the OLD system used, and it is
     * unique, which is what makes an import safely repeatable: running the same
     * export twice updates the same rows instead of inventing a second year of
     * revenue. Without it there is no way to tell a re-import from real growth.
     */
    importBatchId: uuid("import_batch_id").references(() => importBatches.id),
    legacyReference: varchar("legacy_reference", { length: 120 }),

    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_reference_idx").on(table.reference),
    uniqueIndex("orders_legacy_ref_idx").on(table.legacyReference),
    index("orders_status_idx").on(table.status),
    index("orders_placed_idx").on(table.placedAt),
  ],
);

/**
 * Order lines snapshot name and price. `variantId` is a soft pointer kept for
 * reporting. If the variant is archived the line still reads correctly.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variants.id),

    nameSnapshot: varchar("name_snapshot", { length: 300 }).notNull(),
    sizeSnapshot: varchar("size_snapshot", { length: 48 }),
    /**
     * The catalogue slug at time of purchase.
     *
     * `variantId` is null while the catalogue still lives in a static file, so
     * without this an order line has no way back to the thing that was bought.
     * It is also what "customers who bought this" and reorder links key on, and
     * unlike a foreign key it keeps working after a product is archived.
     */
    slugSnapshot: varchar("slug_snapshot", { length: 180 }),
    unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalMinor: bigint("line_total_minor", { mode: "number" }).notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * First-party event stream.
 *
 * One wide table rather than a table per event type: event shapes change
 * constantly and migrations should not be the cost of tracking something new.
 * `props` is jsonb; the columns that get queried in every report. Session,
 * name, time, path, are promoted out for indexing.
 *
 * `anonymousId` is a first-party cookie, not a fingerprint. No third-party
 * scripts, so this survives ad blockers and is a lot easier to justify under
 * privacy law than shipping visitor data to an analytics vendor.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    anonymousId: varchar("anonymous_id", { length: 64 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.id),

    path: varchar("path", { length: 512 }),
    referrer: varchar("referrer", { length: 512 }),
    /** utm_* captured once per session, so attribution survives navigation. */
    utmSource: varchar("utm_source", { length: 120 }),
    utmMedium: varchar("utm_medium", { length: 120 }),
    utmCampaign: varchar("utm_campaign", { length: 160 }),

    props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),

    /** Coarse only. No raw IP, no user agent string. */
    country: varchar("country", { length: 2 }),
    deviceType: varchar("device_type", { length: 16 }),

    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_name_time_idx").on(table.name, table.occurredAt),
    index("events_session_idx").on(table.sessionId),
    index("events_anon_idx").on(table.anonymousId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Shop configuration                                                         */
/* -------------------------------------------------------------------------- */

/**
 * What delivery costs, per region.
 *
 * This table is why the order screen can stop being a manual job. Until now
 * every order needed someone to work out a delivery charge by hand and type it
 * in, which is fine at three orders a week and unworkable at thirty.
 *
 * A region with NO ROW is not free, it is unquoted. That distinction is the
 * whole point: an absent rate means "we will call you", and the checkout says
 * so. Storing 0 to mean "not set up yet" is how a shop accidentally ships
 * nationwide for nothing.
 *
 * `freeOverMinor` is the free-delivery threshold for that region. Null means
 * there is no threshold, not that everything is free.
 */
export const deliveryRates = pgTable(
  "delivery_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Matches a value in lib/checkout REGIONS. */
    region: varchar("region", { length: 80 }).notNull(),
    feeMinor: bigint("fee_minor", { mode: "number" }).notNull(),
    /** Basket subtotal at or above which delivery is free. Null = no offer. */
    freeOverMinor: bigint("free_over_minor", { mode: "number" }),
    /** Shown to the customer, e.g. "1 to 2 working days". */
    etaLabel: varchar("eta_label", { length: 80 }),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("delivery_rates_region_idx").on(table.region)],
);

/**
 * Shop-wide settings, one row per key.
 *
 * Key/value rather than a single wide row so adding a setting is an insert, not
 * a migration. `value` is jsonb so a setting can be a number, a string or a
 * small object without a new column each time.
 */
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Bringing the old business in                                               */
/* -------------------------------------------------------------------------- */

export const documentKind = pgEnum("document_kind", [
  "price_list",
  "supplier",
  "certificate",
  "financial",
  "brand",
  "data_export",
  "other",
]);

/**
 * Files the owner uploads: price lists, certificates, supplier terms, exports
 * from whatever system the business ran on before.
 *
 * This exists so the history of the business can arrive on day one rather than
 * being retyped. It is also the raw material for anything AI: a price list and
 * a certificate are facts a model can be grounded in, and grounding is the
 * difference between a useful assistant and one that invents claims about a
 * cosmetic product.
 *
 * Bytes live in the row. See the `bytea` note at the top of this file for why,
 * and for the conditions under which that should change.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 240 }).notNull(),
    kind: documentKind("kind").notNull().default("other"),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    content: bytea("content").notNull(),
    /** What it is and why it was kept, in the owner's words. */
    notes: text("notes"),
    uploadedBy: varchar("uploaded_by", { length: 240 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("documents_kind_idx").on(table.kind)],
);

export const importStatus = pgEnum("import_status", [
  "previewed",
  "committed",
  "failed",
]);

/**
 * A record of every spreadsheet that was brought in.
 *
 * Imports go wrong quietly: a date column read as American, a price read as
 * cedis when it was pesewas, one duplicate run that doubles a year of revenue.
 * Without a batch record there is no way to tell which rows came from where, so
 * every committed row carries its batch id and a bad import can be identified
 * and undone rather than argued about.
 */
export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    filename: varchar("filename", { length: 300 }).notNull(),
    /** What the file turned out to contain. */
    entity: varchar("entity", { length: 40 }).notNull(),
    status: importStatus("status").notNull().default("previewed"),
    rowsTotal: integer("rows_total").notNull().default(0),
    rowsImported: integer("rows_imported").notNull().default(0),
    rowsSkipped: integer("rows_skipped").notNull().default(0),
    /** Column mapping used, plus the reason for every skipped row. */
    report: jsonb("report").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("import_batches_time_idx").on(table.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 240 }).notNull(),
    name: varchar("name", { length: 200 }),
    role: adminRole("role").notNull().default("staff"),
    /** External auth subject (Clerk user id), once Clerk lands. */
    authSubject: varchar("auth_subject", { length: 120 }),

    /**
     * scrypt hash, stored as `scrypt$N$r$p$salt$hash`, all base64url.
     *
     * This column exists because the single shared ADMIN_PASSWORD made the audit
     * log a lie: every row recorded actor "admin", so the moment a second person
     * had the password there was no way to tell who changed a price, and no way
     * to revoke one person without locking everyone out.
     *
     * scrypt rather than bcrypt because it is in Node's standard library and
     * this project should not take a native dependency for one function. It is
     * memory-hard, which is the property that matters against the GPU attack a
     * leaked hash invites.
     *
     * Null is legitimate: an invited user who has not set a password yet, or a
     * user who will authenticate through Clerk later.
     */
    passwordHash: text("password_hash"),
    /** Forces a password change on next sign-in. Set when an owner resets one. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),

    active: boolean("active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_email_idx").on(table.email)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => adminUsers.id),
    actorEmail: varchar("actor_email", { length: 240 }),
    action: varchar("action", { length: 64 }).notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    /** Before/after, so a bad edit can be understood and undone. */
    changes: jsonb("changes").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entity, table.entityId),
    index("audit_time_idx").on(table.createdAt),
  ],
);

export const stockistTier = pgEnum("stockist_tier", [
  "bronze",
  "silver",
  "gold",
  "vip",
]);

export const stockistStatus = pgEnum("stockist_status", [
  "pending",
  "approved",
  "declined",
]);

export const stockists = pgTable(
  "stockists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessName: varchar("business_name", { length: 240 }).notNull(),
    contactName: varchar("contact_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 240 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    businessType: varchar("business_type", { length: 80 })
      .notNull()
      .default("retail_shop"),
    tier: stockistTier("tier").notNull().default("bronze"),
    status: stockistStatus("status").notNull().default("pending"),
    region: varchar("region", { length: 80 }),
    town: varchar("town", { length: 120 }),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("stockists_email_idx").on(table.email),
    index("stockists_status_idx").on(table.status),
  ],
);

export const wholesaleInquiries = pgTable(
  "wholesale_inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockistId: uuid("stockist_id").references(() => stockists.id),
    businessName: varchar("business_name", { length: 240 }).notNull(),
    contactName: varchar("contact_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 240 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    interest: varchar("interest", { length: 160 }).notNull(),
    estimatedVolume: varchar("estimated_volume", { length: 120 }),
    status: varchar("status", { length: 48 }).notNull().default("new"),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("inquiries_email_idx").on(table.email)],
);

