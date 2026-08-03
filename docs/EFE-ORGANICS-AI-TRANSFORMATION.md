# Efe Organics: Digital & AI Transformation

**Prepared for:** Alberta, Efe Organics
**Prepared by:** Accra Innovation Centre
**Date:** 25 July 2026
**Status:** Findings & proposal

> A designed version of this document is published as an artifact:
> https://claude.ai/code/artifact/e9946529-8337-4da2-87a6-9382d0bb0234
> This file is the repo-side record and the one to edit when facts change.

---

## 1. Summary

Efe Organics has finished the hard part: the 2026 rebrand is done, brand
guidelines exist, formulations are proven, 41 products are selling. What is
missing is a channel the brand controls.

Every unit sold online today goes through **coloursbay.com**, a reseller. That
reseller owns the storefront, the pricing, the customer list, the search traffic
and the reorder relationship. Efe owns manufacturing and the brand, the hardest
things to build, and rents the comparatively cheap thing.

`efeorganics.com` is registered but parked (resolves to aveshost). There is no
owned storefront, no customer database, no repeat-purchase mechanic, and no way
to reach a past buyer directly.

**Recommendation:** build the brand's own storefront first. Then layer AI where
it removes real work. Marketing production for the owner, ordering for the
outlets, guidance for the buyer, not where it merely looks modern.

---

## 2. Catalogue analysis

Captured from the live reseller listing, 25 July 2026. 41 Efe SKUs (the reseller
brand page claims 46; five are not on the shop index. One further SKU there,
"Bubbles Multi-Use Liquid Soap", is Mount Africa, not Efe).

| Range | SKUs | Avg price | Low | High |
|---|---:|---:|---:|---:|
| African Black Soap | 14 | GH₵84 | 15 | 150 |
| Hair Care | 12 | GH₵78 | 50 | 150 |
| Body Care | 5 | GH₵98 | 50 | 138 |
| Lotions & Butters | 5 | GH₵78 | 40 | 110 |
| Skincare | 3 | GH₵83 | 50 | 138 |
| Oils | 2 | GH₵55 | 50 | 60 |
| **Total** | **41** | **GH₵81** | **15** | **150** |

Average discount from listed RRP: **17%**.

### What the full import turned up

An importer (`scripts/scrape-reseller.mjs`) walks every product page and pulls
the underlying record. Four findings:

1. **A quarter-tonne SKU nobody links to.** *Pure African Black Soap Crumble,
   250kg, GH₵13,750* (RRP GH₵16,250). Raw soap "as desired by formulators,
   wholesalers and retailers". Not on the shop index; reached only via a
   related-product link. With the reseller's 20%-off bulk mechanic (min. 12 or 28
   pcs) on consumer SKUs, this suggests a raw-material/trade business that isn't
   being presented as one. **Most commercially interesting thing in the data.**
2. **Ingredient lists already exist**. 38 of 42 SKUs, plus directions on 37, in
   the brand's own voice. This was a blocker; it's now largely answered. It also
   gives the AI copywriter a factual base, which is what makes the "never invent
   a claim" rule enforceable.
3. **66 photographs, decent but not launch-grade.** Real lifestyle shots, not
   flat catalogue images. But inconsistent backgrounds/crops/formats, and 11 of
   28 size families have one angle only. Imported as placeholders; reshoot still
   recommended; ownership unconfirmed.
4. **The reseller's categories are broken.** 22 products under `bodycare`
   (including every black soap bath) vs 2 under `African Black Soap`, plus two
   separate body-care slugs. A customer cannot find the flagship line there. We
   discarded that taxonomy, see `scripts/curation.mjs`.

### Three findings

1. **The catalogue is barbell-shaped.** 15 SKUs at ≤GH₵50, 14 at >GH₵100, only
   12 in between. The cheap end is a trial product; the expensive end is a
   stock-up product. The site must do two different conversion jobs.
2. **A wholesale channel is already hiding in the range.** 13 SKUs, nearly a
   third, are sold in 1L format. Nobody buys a litre of black soap bath for one
   bathroom. These are salon/spa/trader sizes being sold through a consumer
   storefront at consumer prices. Clearest commercial opportunity in the data.
3. **The size ladder is real but unexploited.** Lemon Blast exists at 350ml,
   500ml and 1L; Sweet Lavender and Cool Herbal at two sizes each. On a reseller
   grid these look like unrelated products. On our product page they become one
   product with a size selector, a natural upsell from GH₵40 to GH₵115.

---

## 3. Phase 1: the website

Not a brochure. A storefront that takes money, captures the customer, and feeds
everything after it.

**Sells**: all 41 SKUs with size selectors; Paystack checkout (MTN/Telecel
mobile money + cards); brand-set delivery zones; email + WhatsApp confirmation.

**Captures**: first-party order records (who, what, when, what size); reorder
prompts timed to how long a 350ml bath actually lasts. This asset compounds; the
reseller's list never becomes Efe's.

**Tells**: the 2026 rebrand story in the brand's own words; ingredient
provenance and farmer relationships; search-visible product pages so "African
black soap Ghana" finds Efe, not only its reseller.

**Recruits**: a public stockist directory (free marketing for outlets,
credibility for the brand) and an application form for new outlets.

> **On the reseller relationship.** Going direct does not require dropping
> Coloursbay, and a fight is not recommended. Usually the brand site holds the
> full range and the story while the reseller keeps its share of volume. But the
> pricing question must be settled before checkout goes live, see §7.

---

## 4. Where AI earns its keep

Four audiences, four different problems. Proposed only where AI removes work
someone does by hand today.

### For the owner: a marketing studio inside the admin

The highest-value piece, and the explicit ask. Today a launch means briefing a
designer, waiting, revising, then writing captions by hand. In the studio: pick
a product, pick an occasion, get a campaign.

- **Copy**: product descriptions, website sections, WhatsApp broadcasts, launch
  captions. Generated from the real product record, in the brand voice, always
  editable before anything ships.
- **Design**: marketing graphics on brand-locked templates. Palette, leaf motif
  and logo lockups are fixed, so nothing off-brand can be produced by accident.
- **Product imagery**: AI lifestyle and background scenes built around real
  product photography. This does not replace a proper shoot; say so plainly.
- **Publishing**: approved posts go straight into Blotato (see §5).

### For the team: ask the business a question

- Plain-language questions over live order data: what moved this week, which
  flavour is stalling, which outlet has gone quiet.
- Production planning from actual sales velocity rather than instinct.
- Customer messages drafted for a human to approve, never auto-sent.

### For the outlets: reordering that takes thirty seconds

- Stockist portal: wholesale pricing, order history, one-tap reorder.
- A marketing kit generated for *that* outlet. Their name, their location,
  Efe's products, ready to post. Outlets market more when the material is theirs.
- Low-stock nudges based on their own reorder rhythm.
- Commission and performance visible to both sides.

### For the buyer: help choosing, in a range of 41

- A short skin-and-hair guide that recommends a routine from the real catalogue,
  and can say "start with the GH₵15 bar" when that is the honest answer.
- Ingredient and suitability answers on the product page, from approved data only.
- A WhatsApp assistant, where Ghanaian beauty purchases actually get closed.

### Hard rule

**AI never invents a product claim.** Cosmetic claims are FDA-regulated in Ghana
and are an export risk for the 2028 international plan. Every generated claim is
drawn from an approved ingredient and claims list, and a human approves before
publication. Build the approval step before the generation step.

---

## 5. Tooling review: Blotato

Social scheduling and cross-posting: one piece of content formatted and published
to nine networks (Instagram, TikTok, Facebook, LinkedIn, X, YouTube, Threads,
Pinterest, Bluesky). Drag-and-drop calendar, AI caption generation, template
carousels and short video. Flat **$29/month**, unlimited posts.

**Key finding: it has a proper REST API**: media upload, post creation,
scheduling, slot management, at 30 requests/minute, plus n8n/Make nodes and MCP
support. We do not have to rebuild social scheduling, and should not.

**Division of labour:** the Efe admin studio is where content is *created*,
that is where product data, brand rules and the approval step live. Blotato is
where it is *published*. One button hands an approved post to Blotato's calendar.
Alberta keeps the tool she knows; the brand gains the production capacity it
lacks.

Needed to wire up: an API key and the list of connected social accounts.

---

## 6. Sequence

| # | Phase | State | Gate |
|---|---|---|---|
| 1 | Foundation. Scaffold, tokens, catalogue import, size grouping, motion system, home page | **done** | - |
| 2 | Catalogue & story. Shop, product pages, about, stockists, SEO | next | product photography |
| 3 | Commerce. Cart, Paystack (MoMo + card), delivery, confirmations | | the pricing decision |
| 4 | Admin studio. Auth, product/price CRUD, orders, stockists | | - |
| 5 | AI marketing studio. Copy, design, briefs, approval, Blotato publish | | approved claims list |
| 6 | Channel tools. Stockist portal, per-outlet kits, WhatsApp | | wholesale terms |

Each phase is useful alone. No phase before 5 depends on an AI key existing.

---

## 7. What we need from Efe

Phases 1-2 continue without any of this. Everything after needs answers. Full
list with technical detail in [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md).

1. **Product photography**, the single biggest blocker to a credible
   storefront. Do usable images exist, and does Efe own the reseller's? If not,
   41 SKUs is a one-day shoot with the right setup.
2. **The master price list**, with sizes, and whether the reseller's prices are
   Efe's own RRP.
3. **Wholesale terms**. Outlet discount, minimum order, payment terms.
4. **Ingredient lists and FDA registration status** per SKU.
5. **Organic / cruelty-free certification**, body and certificate number. The
   claim is already made on the reseller page; it should be substantiated on the
   brand's own site.
6. **Registrar access** for efeorganics.com.
7. **Blotato API key** + connected accounts.
8. **The Recoleta question**. The guidelines specify it; it is a commercial
   licence. The site ships a close free substitute. Either is fine, but it
   should be a decision.

---

## 8. AscendSME: deliberately unresolved

Alberta expressed interest in AscendSME for the business side. Finance,
invoicing, CRM, inventory, staff. It is a working platform built for Ghanaian
SMEs with a connected data model (a paid invoice moves the ledger and the stock
together) and a sustainability score aimed at bankability.

Whether Efe onboards as-is or warrants a tailored build is a conversation
involving Collins, and this document does not resolve it. The two systems meet at
exactly one seam, website orders flowing into inventory and the ledger, and
that is a phase-4 concern. **The website does not wait on it.**

---

## Sources

- *Efe Organics Forward Presentation*, 18 July 2026 (12 slides, incl. brand
  guidelines: palette, typography, logo variations)
- Efe Organics logo pack (3 lockups)
- Live Coloursbay listing, brand filter "Efe Organics", captured 25 July 2026
- Blotato product site and documentation (`help.blotato.com`)
- `ascendsme-b` repository, SME Suite implementation summary
