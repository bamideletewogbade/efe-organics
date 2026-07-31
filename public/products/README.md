# Product imagery — provenance and rights

These 66 images were imported from **coloursbay.com** (the reseller) by
`scripts/scrape-reseller.mjs` on 25 July 2026. They are photographs of Efe
Organics products, uploaded to the reseller's own Supabase storage.

## Status: working placeholders, not cleared for launch

They are here so the site can be designed, built and reviewed against real
products instead of grey boxes. **Efe's ownership of these files is
unconfirmed.** Before the site goes public, one of these has to happen:

1. Efe confirms it owns the photography and the reseller was simply given
   copies — nothing further needed; or
2. The reseller grants written permission to use them; or
3. **We reshoot.** 41 shelf SKUs is a one-day studio job and the results would
   be better anyway — the current set is inconsistent in lighting, background
   and crop, and several products have only one angle.

Option 3 is the recommendation. The imported set is good enough to build
against and not good enough to launch on.

## Quality notes for whoever shoots the replacement

- 24 of 41 shelf SKUs have a second angle; 17 have only one. The product card
  cross-fades to the second image on hover, so single-image products lose that
  interaction.
- Backgrounds vary between white, off-white and lifestyle. Pick one.
- Formats are mixed PNG/JPEG at inconsistent dimensions.
- No size-comparison shot exists. Given the 350ml → 1L ladder is the main
  upsell, a family shot per size group would earn its place.

## Refreshing

```bash
node scripts/scrape-reseller.mjs    # re-download from the reseller
node scripts/generate-catalog.mjs   # rebuild src/lib/catalog.data.ts
```

When real photography arrives, drop it in `/products/<slug>/` following the same
`1.jpg`, `2.jpg` naming and point `scripts/curation.mjs` at it — or retire the
scraper entirely and hand-maintain the generated catalogue's `images` arrays.
