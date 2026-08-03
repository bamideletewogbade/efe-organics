# Efe Organics: Architecture

> Source of truth for how this app is structured. Read this before building; update it when
> a structural decision changes.

**Product:** the direct-to-consumer home of Efe Organics™ ("Life & Organics"), an Accra-based
manufacturer of organic African Black Soap skin and hair care. Today the catalogue lives only on
a third-party reseller (coloursbay.com). This is the brand's own storefront.

**Intended domain:** `efeorganics.com` (registered, currently parked on aveshost).
Dev server runs on port **3230** (`npm run dev -- --port 3230`) to stay clear of the AI 360
projects on 3210/3220.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next 16** (App Router, Turbopack) | House standard; RSC-first, good SEO for a commerce site |
| UI | **React 19** + TypeScript (strict) | House standard |
| Styling | **Tailwind v4** (CSS-first `@theme`) + design tokens in `globals.css` | No JS config file; tokens are the single source of brand truth |
| Data | **Postgres + Drizzle ORM** (`src/db/`), static catalogue as fallback | Own the backend, see §7 |
| Payments | **Paystack** (Ghana MoMo, MTN/Telecel, + cards) | Same provider as the AI 360 wallet; MoMo is non-negotiable for GH |
| Auth (admin) | Clerk, deferred to Phase 3 | Not needed until the admin studio exists |
| AI | Server-side gateway route, provider-agnostic (OpenRouter) | Same pattern as AI 360 Lab: keys never touch the browser |
| Social | **Blotato** REST API (`api.blotato.com`) | The owner already uses it; we publish into it rather than rebuild scheduling |
| Hosting | Vercel + custom domain | House standard |

### Middleware naming gotcha

Next 16 renamed the middleware convention. The file is **`src/proxy.ts`**, not `middleware.ts`.
Same as the AI 360 website and Workspace.

---

## 2. Directory layout

```
src/
  app/
    (marketing)/            # public brand + commerce surface
      page.tsx              # home
      about/                # the rebrand story, values, heritage
      shop/                 # catalogue index (filter by category)
        [slug]/             # product detail
      collections/[category]/
      stockists/            # where to buy, outlet locator
      partners/             # become a stockist / reseller application
      contact/
    (studio)/               # Phase 3: signed-in admin. Isolated route group.
      studio/
    api/
      ai/                   # server-side AI gateway (copy, images, briefs)
      social/               # Blotato publish/schedule proxy
    layout.tsx              # root: fonts, <Brand> metadata, skip link
    globals.css             # design tokens + base layer. THE brand source of truth.
  components/
    layout/                 # SiteHeader, SiteFooter, Container, Section
    commerce/               # ProductCard, PriceTag, CategoryNav, AddToCart
    ui/                     # primitives (Button, Badge, Field)
    brand/                  # Wordmark, BrandLeaf, the drawn marks (see §4)
  lib/
    brand.ts                # name, tagline, contact, socials, legal, no hardcoded strings in JSX
    catalog.ts              # types + the repository interface. Hand-written.
    catalog.data.ts         # GENERATED, 42 real SKUs. Never hand-edit (see §5)
    money.ts                # GHS formatting. Cedis, no floating point
    env.ts                  # typed env + `has*` capability flags (graceful degradation)
    seo.ts                  # metadata + JSON-LD builders
  proxy.ts                  # Next 16 middleware (Phase 3)
scripts/
  scrape-reseller.mjs       # imports facts + imagery from the reseller
  curation.mjs              # reseller slug → our taxonomy. The editorial layer.
  generate-catalog.mjs      # scrape + curation → src/lib/catalog.data.ts
public/
  brand/                    # supplied logo lockups, JPEGs on black (see §4)
  products/<slug>/          # imported product imagery + README on rights
```

**Route groups carry the layout split.** `(marketing)` is public, cached, and SEO-heavy;
`(studio)` is private, dynamic, and never crawled. They share tokens, not chrome.

> Phase 0 note: the groups are not yet materialised. Every route today is public, so `page.tsx`
> sits at the app root and the header/footer live in the root layout. The `(marketing)` /
> `(studio)` split lands with the admin studio in Phase 3, when the chrome actually diverges.

---

## 3. Non-negotiable rules

1. **Graceful degradation.** `lib/env.ts` exposes `hasPaystack`, `hasAI`, `hasBlotato`, `hasDb`.
   Every integration checks its flag and falls back to a working demo path. The app must run,
   build, and demo with an **empty `.env.local`**. (Same rule that made AI 360 Lab demoable.)
2. **Secrets are server-only.** No key ever reaches the client. AI and Blotato calls go through
   `app/api/*` route handlers. Nothing sensitive gets a `NEXT_PUBLIC_` prefix.
3. **One data seam.** Pages never reach for a data source directly, they call the repository in
   `lib/catalog.ts`. Swapping static → Postgres must not touch a single page component.
4. **Tokens, not hex.** No raw colour values in components. Everything resolves to a
   `--efe-*` custom property defined in `globals.css`.
5. **Money is integer minor units.** Prices are stored as pesewas (`7000` = GH₵70.00) and
   formatted only at the edge by `lib/money.ts`. Never a `float`.
6. **Mobile-first.** The buying audience is on Android phones over mobile data. Every layout is
   designed at 360px first, and images ship as AVIF/WebP through `next/image`.

---

## 4. Design system

### Palette: rebuilt from the 2026 monogram (27 July 2026)

The palette is **measured from the new logo artwork**, not chosen alongside it. The brand deck's
slide-12 palette (forest `#254336`, sage, cream) predates the monogram and has been retired: it
described a different, greener brand.

Sampling `efe-monogram-gold.jpg` and its white-paper twin gives the real values, a **gold** that
runs `#7a5d27 → #c9a84c → #f0e5b9` from shadow to highlight, an **olive** tea leaf at `#607a1b`
(yellow-toned and deep, nothing like grass green), a **plate** at `#0d0d0e`, and **paper** at
`#f7f6f2`.

| Token | Hex | Role |
|---|---|---|
| `--color-obsidian` | `#0d0d0e` | The logo's own plate. Hero, page headers, footer |
| `--color-ink` | `#141416` | Second dark step |
| `--color-char` | `#22221f` | Warm near-black for solid buttons on paper |
| `--color-gold` | `#c9a84c` | The mark's mid gold. Prices, eyebrows, the premium signal |
| `--color-gold-deep` | `#7a5d27` | Measured shadow. Gradient stop; AA on paper |
| `--color-gold-light` | `#f0e5b9` | Measured highlight. Gradient stop only |
| `--color-olive` | `#607a1b` | The measured tea leaf. Accent on light grounds |
| `--color-olive-light` | `#a3c164` | Lifted olive, the only one readable on obsidian |
| `--color-paper` | `#f7f6f2` | Page ground, and text on dark plates |

**Two corrections this replaced, both worth remembering:**

1. **The green was wrong.** The accent was `#3fcc33`, a vivid grass green picked to make the page
   feel "alive". The logo's leaf is an olive. Neon green beside metallic gold reads as a sports
   brand, and it was fighting the mark on every screen it shared.
2. **The dark was wrong.** Grounds were forest green (`#08170f`-`#254336`). The monogram sits on
   near-neutral black, and gold on green-black goes muddy, gold needs a neutral ground to read
   as metal.

**Dominance:** paper ~55%, obsidian ~30%, olive ~10%, gold ~5%. Gold is a detail, never a field.

**Contrast is verified, not assumed.** Every semantic pair passes WCAG AA in both themes,
lowest is 5.05 (muted on paper, light) and 6.83 (muted on obsidian, dark). `--color-olive`
deliberately never appears as text on obsidian; `--color-olive-light` is its dark-ground twin,
and `.on-dark` swaps them automatically.

### Typography

The deck specifies **Recoleta** for headings and display, a clean sans for body.
Recoleta is a commercial licence the brand does not yet hold, so:

- `--font-display` ships as **Fraunces** (Google, free), the closest warm high-contrast serif.
- Swap in Recoleta by dropping the webfont into `src/app/fonts/` and changing one `next/font`
  declaration in `layout.tsx`. Nothing else changes.
- `--font-body` is **DM Sans**.

### Logo assets: a real constraint

All three supplied lockups are **JPEGs on a black plate**. There is no transparent PNG or SVG.
Placing one on the cream header renders a black rectangle, and `mix-blend-multiply` does not
save it. So:

- **Light surfaces** use `components/brand/Wordmark.tsx`, the name set in the display face
  beside a drawn leaf. Typographic, scalable, correct.
- **Dark surfaces** (hero, footer) can use the supplied rasters, where the black plate is
  invisible against forest.
- Replace `Wordmark` the moment a transparent wordmark asset exists.

Note the **circular gold badge** ("Efe · EST. 2012") is *not* a legacy mark, it is the badge
printed on current product labels. Treat it as the packaging mark, distinct from the web
wordmark.

### Motif

Repeated element: the **leaf**, and generous whitespace on cream. No accent stripes, no
gradient banners. Product photography does the work; the chrome stays quiet.

### Motion

Motion is a layer on top of a correct static page, never a prerequisite for reading it.
Everything lives in the motion layer of `globals.css`; components only add class names.

Two hard rules:

1. **The page is complete with zero motion.** Nothing starts at `opacity: 0` unless the browser
   has confirmed via `@supports` that it can finish the animation. This is why scroll reveals sit
   inside `@supports (animation-timeline: view())`. Safari and Firefox get a fully visible page
   rather than blank sections. Getting this backwards ships an invisible website.
2. **Transform and opacity only.** No animating width, height, colour or shadow across large
   surfaces. The audience is on mid-range Android over mobile data.

| Class | What it does | Cost |
|---|---|---|
| `.enter` / `.enter-stagger` | One-shot entrance on load, children staggered 60-440ms | CSS only |
| `.reveal` / `.reveal-group` | Scroll-linked reveal via `animation-timeline: view()` | CSS only, no observer |
| `.header-condense` | Header gains tint + hairline over the first 90px via `animation-timeline: scroll()` | CSS only |
| `.card-lift` | 4px lift, plus cross-fade to a second product photograph | CSS only |
| `.card-rule` / `.link-rule` | Gold hairline sweeping from the left | CSS only |
| `.press` | 2.5% scale on `:active` | CSS only |
| `.leaf-draw` / `.leaf-fill` | The one flourish: hero leaf draws itself once | CSS only |
| `::view-transition-*` | 160/320ms cross-fade between routes (`viewTransition` in next.config) | Native |

**Correction (27 July 2026): there are now TWO motion systems, and that is deliberate.**

This section previously claimed "no animation library and no JavaScript in the motion system".
That stopped being true when `motion` (Framer Motion v12) was added for the nav and hero. The
split is on capability, not preference:

| System | Owns | Why |
|---|---|---|
| **CSS** (table above) | Scroll reveals, card hovers, the ingredient marquee, view transitions | Free, off the main thread, works before hydration. Still the default. |
| **Framer Motion** (`motion/react`) | Header, hero, product cards, shop toolbar | Needs what CSS cannot do: pointer tracking (`useSpring`), scroll interpolation (`useScroll`/`useTransform`), shared layout (`layoutId`), and presence (`AnimatePresence`) |

**The rule:** reach for CSS first. Import `motion` only when the interaction needs gesture
tracking, scroll interpolation, shared layout, or exit animation. "It would be tidier in JS" is
not a reason. The marquee is CSS precisely because `animation-play-state: paused` gives
pause-on-hover for free, which a JS-driven transform cannot.

Shared tokens live in `components/motion/tokens.ts` and **mirror the CSS custom properties on
purpose**. Two systems, one feel. Change a curve in one, change it in the other.

Timings: `--dur-fast` 180ms (feedback), `--dur-base` 320ms (transitions), `--dur-slow` 620ms
(entrances). One easing curve. `--ease-soft`, a soft expo-out that settles rather than bounces.

`prefers-reduced-motion: reduce` cancels every entrance outright (`animation: none`, forced
`opacity: 1`). Shortening the duration is not sufficient, the `both` fill mode would otherwise
leave elements stuck on the starting keyframe.

---

## 5. Data model and the import pipeline

### The pipeline

```
coloursbay.com  ──scrape-reseller.mjs──►  scripts/out/reseller-catalogue.json
                                                      │
                        scripts/curation.mjs ─────────►│
                                                      ▼
                                        generate-catalog.mjs
                                                      │
                                                      ▼
                                          src/lib/catalog.data.ts  (committed)
```

**The split matters.** The scrape owns *facts*. Names, prices, descriptions, ingredients,
how-to-use, imagery. `curation.mjs` owns *meaning*. Category, product line, size, variant
grouping, and our own slugs. They are separate files because the reseller's own taxonomy is
unusable: 22 products sit in `bodycare` (including every black soap bath) while
`african-black-soap` holds 2, and it carries both `bodycare` and `body-care` as distinct slugs.

The generated file is **committed** so the site builds with no network access. Re-run the two
scripts to refresh; never hand-edit `catalog.data.ts`.

The reseller is a Next.js app, so each product page embeds its record in the RSC flight payload.
The scraper brace-matches `"product":{…}` out of the HTML. And must unescape one level first,
because every quote arrives as `\"` and a string-aware matcher otherwise runs off the end of the
document.

### The model

```ts
type Product = {
  slug: string
  name: string
  baseName?: string         // name with the size stripped, for grouped display
  category: CategorySlug    // 'black-soap' | 'hair-care' | 'body-care' | ...
  line: 'flagship' | 'supporting'
  group?: string            // size family, see below
  wholesale?: boolean       // bulk trade SKU, hidden from the consumer shop
  priceMinor: number        // pesewas
  compareAtMinor?: number   // reseller RRP, for the savings badge
  sizeMl?: number
  sizeG?: number
  blurb?: string
  ingredients?: string      // supplied for 38 of 42 SKUs
  howToUse?: string         // supplied for 37 of 42 SKUs
  tags?: string[]
  images: string[]
  inStock: boolean
}
```

**Size families are the important structural idea.** `group` collapses "Lemon Blast 350ml /
500ml / 1L" into one shelf entry with a size selector. 42 SKUs become **28 buying decisions**
across 11 families. `listShelf()` returns grouped entries led by the cheapest variant, so the
entry price is what a first-time buyer sees; `listProducts()` still returns flat SKUs for
sitemaps and admin.

**One SKU is not a consumer product.** `african-black-soap-crumble-250kg` is raw soap crumble at
GH₵13,750 a quarter-tonne, sold to formulators and wholesalers. It is flagged `wholesale` and
excluded from every consumer reader by default. It belongs on the trade page, not the shop.

### Caveats carried in the data

- **Prices** are the reseller's selling prices, not confirmed as Efe's own RRP. Do not switch on
  checkout against them (`docs/OPEN-QUESTIONS.md` #1).
- **Imagery** is the reseller's upload; ownership unconfirmed. See `public/products/README.md`.

---

## 6. Roadmap

| Phase | Scope | State |
|---|---|---|
| **0. Foundation** | Tokens, fonts, shell, brand/env/catalog libs, home page | **this commit** |
| 1. Catalogue | Shop index, filters, product detail, collections, SEO + JSON-LD | next |
| 2. Commerce | Cart, Paystack checkout (MoMo + card), order email, delivery zones | |
| 3. Studio | Clerk auth, product CRUD, order dashboard, stockist directory admin | |
| 4. AI marketing studio | Copywriter, image generation, campaign briefs → Blotato publish | |
| 5. Channel tools | Stockist portal (reorder, price list, marketing kit), WhatsApp catalogue sync | |

Phases 4-5 are specified in `docs/EFE-ORGANICS-AI-TRANSFORMATION.md` (the strategy document).
Nothing in phases 0-3 may depend on an AI key existing.

---

## 7. The backend (decided 28 July 2026)

Efe **owns** its backend rather than renting one. The alternative was running this
storefront headless against Ecwid, which the owner already uses. Own-it won on a
business argument, not a technical one: the platform fee is recurring and
permanent, and the agency can bill for a system Efe keeps.

That decision means this project has to actually replace an e-commerce admin,
catalogue, stock, pricing rules, orders, customers, analytics, so the schema was
designed against that bar, not against "a website with some products".

### Stack

**Postgres + Drizzle ORM.** Drizzle over Prisma: no separate engine binary, no
generate step, SQL-shaped queries, and migrations are reviewable SQL files rather
than an opaque diff. On a project where one person owns the whole stack, being
able to read the migration matters more than ORM ergonomics.

### The reshape that made it worth doing

The imported catalogue was 42 flat rows where a "product" was really a SKU, with
a `group` string tying sizes together. Which is why the storefront needed a hack
to show "Lemon Blast 350ml / 500ml / 1L" as one card.

The schema separates **product** (the shelf entry) from **variant** (the sellable
SKU carrying price, size and stock). The seed inverts the flat file into that
shape: **42 rows in → 28 products, 42 variants out.** The UI was already faking
this collapse; now it is real in the data, which is the precondition for
per-size stock, per-size discounts, and per-size reporting.

### Schema rules

1. **Money is integer minor units (pesewas)**, `bigint`. Never a float.
2. **Product ≠ variant.** Price and stock live on the variant, only.
3. **Orders snapshot their lines.** An order copies name and price at purchase
   time. Joining to live products would silently rewrite history the first time
   someone edits a price. The most common e-commerce data bug there is.
4. **Nothing hard-deletes.** Products archive, orders cancel, discounts expire.
5. **Every mutation is attributable** via `audit_log`.

### Tables

| Group | Tables |
|---|---|
| Catalogue | `categories`, `products`, `variants`, `product_images` |
| Inventory | `stock_ledger`. Every movement with a reason, so "where did 20 bars go" is answerable |
| Pricing | `discounts`, `bundles`, `bundle_items` |
| Commerce | `customers`, `orders`, `order_items` |
| Analytics | `events`. First-party, one wide table |
| Admin | `admin_users`, `audit_log` |

**Discounts and bundles are separate on purpose.** A discount is a *rule* applied
to a basket; a bundle is a *thing a customer buys*, with its own name and image.
Conflating them makes both harder to reason about.

**Analytics is one wide table, not one per event.** Event shapes change
constantly and a migration should not be the price of tracking something new.
The fields queried in every report (name, session, time, path) are promoted out
of `props` for indexing. `anonymousId` is a first-party cookie, not a
fingerprint. No third-party script, so it survives ad blockers and is far easier
to justify under privacy law.

### Graceful degradation still holds

`getDb()` returns **null** when `DATABASE_URL` is absent, and the catalogue falls
back to the committed static file. The site runs, builds and demos with an empty
`.env.local`. Verified: there is no `.env.local` in the repo today and the build
passes with all 42 product pages prerendered. `requireDb()` is used only where a
database genuinely is the point (admin writes, order placement).

### Stock seeds at zero, deliberately

Nobody has told us how many bars exist. Inventing quantities would put fiction in
front of customers, so seeded variants have `trackStock: false` and nothing shows
as sold out until the admin enters real numbers.

### Commands

```
npm run db:generate   # schema → reviewable SQL in drizzle/
npm run db:migrate    # apply migrations
npm run db:seed       # static catalogue → products + variants (idempotent)
npm run db:studio     # browse the data
```

`db:push` exists for local iteration and must never touch production, it applies
an inferred diff, which is how columns get silently dropped.

### Logging

`src/lib/logger.ts`. JSON in production (queryable), readable lines in
development. `logger.child()` binds context once so a failed checkout can be read
end to end by filtering on one value. **Sensitive keys are redacted at the
boundary**, phone, email, address, tokens, so a careless `logger.info({
customer })` cannot turn the log store into a copy of the customer database.

### Not built yet

Admin UI, auth (Clerk, matching the house standard), the events pipeline, the
repository swap from static to DB, Paystack. The schema is the foundation those
sit on.
