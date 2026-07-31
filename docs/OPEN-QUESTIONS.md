# Open questions for Efe Organics

Answers change the build. Nothing here blocks Phase 0–1, but each one blocks a
later phase. Raise them in the next session with the owner.

## Commercial

1. **Pricing authority.** Are the cedi prices in `src/lib/catalog.data.ts` the
   brand's own RRP, or set by the reseller? *Blocks Phase 2 checkout.*
2. **Channel conflict.** If efeorganics.com sells direct, what is the agreed
   relationship with coloursbay.com — do we undercut, match, or route to them?
   *Blocks the pricing page and the reseller relationship.*
3. **Stockist economics.** What is the wholesale discount, the minimum order,
   and the payment term for outlets? *Blocks the stockist portal (Phase 5).*
4. **Delivery.** Which zones, at what rate, with which courier? Is there
   pay-on-delivery? *Blocks checkout.*
5. **Catalogue completeness.** The reseller brand page says 46 products. A full
   crawl found **42 Efe SKUs**, one of which (the 250kg crumble) is not on the
   shop index at all. So four are still unaccounted for. Is there a master SKU
   list, and what is the batch/expiry policy?
6. **The bulk business.** The crawl surfaced `Pure African Black Soap Crumble
   250kgs` at GH₵13,750 (RRP GH₵16,250) — raw soap sold to formulators — and the
   reseller runs a "buy bulk, 20% off, min. 12 or 28 pcs" mechanic on consumer
   SKUs. **Is B2B/raw-material supply already a real revenue line?** If so it
   deserves its own page and pricing, not a footnote. This is the single most
   commercially interesting thing the crawl turned up.

## Brand

7. **Recoleta licence.** The deck specifies it. Does the brand hold a licence?
   If not, do we buy one or standardise on the Fraunces stand-in?
8. **Product photography rights.** 66 images have been imported from the
   reseller so the site can be built against real products — see
   `public/products/README.md`. **Does Efe own them?** Recommendation is to
   reshoot regardless: the set is inconsistent in background and crop, and 11 of
   28 size families have only one usable angle. Still the biggest blocker to
   launching.
9. **A transparent logo asset.** All three supplied lockups are JPEGs on a black
   plate, so none can sit on a light background — the header currently uses a
   typographic wordmark instead. A transparent PNG or (better) an SVG of the
   wordmark would replace it immediately.
10. **Which mark is primary.** Three are in play: the green leaf wordmark
    ("efe organics™ / Life & Organics"), the gold "Efe" monogram, and the
    circular gold badge. Note the badge reading **"Efe · EST. 2012"** is *not*
    legacy — it is printed on current product labels, as the imported
    photography shows. So it is the packaging mark. Is that intentional
    alongside the 2026 rebrand, or is packaging due to be updated?

## Legal & compliance

11. **FDA Ghana registration.** Are the SKUs registered? Cosmetic claims on the
    site must match what is registered. *Blocks copy sign-off, and blocks any
    AI-generated claim.*
12. **Ingredient lists — mostly answered, needs verification.** The import
    captured ingredients for **38 of 42 SKUs** and directions for 37, written in
    what reads like the brand's own voice (e.g. the herbal shampoo lists
    "African Black Soap Crumble, Rosemary, Hibiscus, Papaya Leaves, Moringa
    Leaves, Bay Leaves, Cloves"). Two things needed: (a) confirm these are
    accurate and current, and (b) the four missing ones. Once confirmed this is
    the factual base the AI copywriter draws from — it is why the claims rule in
    the brief is enforceable.
13. **"Organic" certification.** The reseller page claims certified organic and
    cruelty-free. Which body, which certificate number?

## Technical

14. **Blotato account.** Which social accounts are connected, and can we get an
    API key scoped to the brand? *Blocks the publish integration.*
15. **Domain control.** `efeorganics.com` resolves to aveshost. Who holds the
    registrar login? *Blocks go-live.*
16. **WhatsApp.** Is there a WhatsApp Business catalogue today? Most Ghanaian
    beauty sales close in WhatsApp — that integration may matter more than the
    website checkout.
