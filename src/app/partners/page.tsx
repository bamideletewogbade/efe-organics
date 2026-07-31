import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { EnquiryConversation } from "@/components/forms/EnquiryConversation";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { TRADE_SCRIPT } from "@/lib/enquiry";
import { countProducts, listWholesale } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sell Efe Organics",
  description:
    "Wholesale African Black Soap and herbal hair care for salons, pharmacies, retailers and formulators in Ghana. Bulk formats and raw soap crumble available.",
  path: "/partners",
});

/**
 * Trade and wholesale.
 *
 * This page exists because of the single most commercially interesting thing the
 * catalogue import turned up: a 250kg raw soap crumble SKU at GH₵13,750 that is
 * linked from nowhere, plus a bulk discount mechanic running on consumer SKUs.
 * Efe appears to have a trade business that is not presented as one.
 *
 * Three audiences are addressed separately because they buy differently: shops
 * that resell finished product, salons that consume 1L formats, and formulators
 * who buy raw material by the tonne.
 *
 * No pricing tiers or minimums are stated — those are not confirmed
 * (docs/OPEN-QUESTIONS.md #6). The page qualifies the lead and hands over.
 */
export default async function PartnersPage() {
  const [wholesale, total] = await Promise.all([
    listWholesale(),
    countProducts(),
  ]);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Sell Efe Organics", path: "/partners" },
  ];

  const audiences = [
    {
      title: "Shops & pharmacies",
      body: "Stock the retail range — bars, baths, shampoos and lotions in consumer sizes, shelf-ready.",
      detail: `${total} products to choose from`,
    },
    {
      title: "Salons & spas",
      body: "One-litre professional formats of the black soap baths, shampoos and conditioners your chairs go through fastest.",
      detail: "13 SKUs in 1L format",
    },
    {
      title: "Formulators & wholesalers",
      body: "Raw African Black Soap crumble by the quarter-tonne — palm kernel oil, cocoa pod ash, shea and cocoa butter.",
      detail: "Sold by the 250kg",
    },
  ];

  return (
    <>
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <section className="on-dark relative under-header overflow-hidden bg-forest-deep">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_65%)] opacity-[0.12] blur-3xl"
        />
        <Container className="relative py-16 lg:py-24">
          <p className="eyebrow text-accent-quiet">Trade &amp; wholesale</p>
          <h1 className="mt-4 max-w-3xl text-4xl/[1.06] sm:text-5xl/[1.04]">
            Sell <span className="text-gilt">Efe Organics</span>
          </h1>
          <p className="measure mt-6 text-lg/8 text-paper/72">
            We supply salons, pharmacies, market traders and formulators across
            Ghana — from shelf-ready retail packs to raw black soap by the
            quarter-tonne.
          </p>
          <a
            href="#enquire"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-saffron-light px-7 py-3.5 font-semibold text-forest-deep transition-transform active:scale-[0.98]"
          >
            Start an enquiry
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </a>
        </Container>
      </section>

      {/* ---- audiences ---- */}
      <section className="py-20">
        <Container>
          <h2 className="text-3xl sm:text-4xl">Who we supply</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="flex flex-col rounded-2xl border border-line bg-surface-raised p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
              >
                <h3 className="text-xl">{audience.title}</h3>
                <p className="mt-3 flex-1 text-base/7 text-muted">
                  {audience.body}
                </p>
                <p className="eyebrow mt-5 text-[0.6rem] text-accent">
                  {audience.detail}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---- raw material ---- */}
      {wholesale.length > 0 && (
        <section className="border-y border-line bg-surface-sunken py-16">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="eyebrow text-accent-quiet">Raw material</p>
                <h2 className="mt-3 text-3xl sm:text-4xl">
                  African Black Soap, by the tonne
                </h2>
                <p className="measure mt-4 text-base/7 text-muted">
                  The same soap that goes into our own range, supplied
                  unfinished for formulators, wholesalers and private-label
                  makers.
                </p>
              </div>

              <ul className="grid gap-3">
                {wholesale.map((product) => (
                  <li
                    key={product.slug}
                    className="rounded-2xl border border-line bg-surface-raised p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-strong">
                        {product.name}
                      </p>
                      <p className="stat shrink-0 text-lg text-strong">
                        {formatPrice(product.priceMinor)}
                      </p>
                    </div>
                    {product.ingredients && (
                      <p className="mt-3 text-xs/6 text-muted">
                        <span className="font-semibold text-strong">
                          Ingredients:{" "}
                        </span>
                        {product.ingredients}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}

      {/* ---- enquiry ---- */}
      <section id="enquire" className="scroll-mt-24 py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="text-3xl sm:text-4xl">Let&rsquo;s talk terms</h2>
              <p className="measure mt-4 text-base/7 text-muted">
                Pricing depends on volume, format and where you are, so instead
                of a form we&rsquo;ll just ask. Six quick questions, under a
                minute, and we come back with real numbers.
              </p>
              <Link
                href="/shop"
                className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent"
              >
                Browse the range first
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>

            <EnquiryConversation
              script={TRADE_SCRIPT}
              kind="trade"
              fallback={
                <EnquiryForm
                  kind="trade"
                  subjects={[
                    "Retail stock for a shop",
                    "1L formats for a salon or spa",
                    "Raw black soap crumble",
                    "Something else",
                  ]}
                />
              }
            />
          </div>
        </Container>
      </section>
    </>
  );
}
