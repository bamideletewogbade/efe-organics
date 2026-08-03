import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHero } from "@/components/layout/PageHero";
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
 * No pricing tiers or minimums are stated, those are not confirmed
 * (docs/OPEN-QUESTIONS.md #6). The page qualifies the lead and hands over.
 */
/**
 * Maps a `?want=` value onto an answer the conversation already asks for.
 *
 * A named allowlist rather than passing the query string through, because the
 * value ends up seeded into an enquiry that gets emailed to the business. An
 * open parameter there is a way to put arbitrary text into somebody's inbox
 * under Efe's name.
 */
const WANTED: Record<string, Record<string, string>> = {
  crumble: { interest: "Raw black soap crumble" },
  retail: { interest: "The retail range" },
  salon: { interest: "1L professional formats" },
};

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ want?: string }>;
}) {
  const [{ want }, wholesale, total] = await Promise.all([
    searchParams,
    listWholesale(),
    countProducts(),
  ]);

  const seed = want ? WANTED[want] : undefined;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Sell Efe Organics", path: "/partners" },
  ];

  const audiences = [
    {
      title: "Shops & pharmacies",
      body: "Stock the retail range. Bars, baths, shampoos and lotions in consumer sizes, shelf-ready.",
      detail: `${total} products to choose from`,
    },
    {
      title: "Salons & spas",
      body: "One-litre professional formats of the black soap baths, shampoos and conditioners your chairs go through fastest.",
      detail: "13 SKUs in 1L format",
    },
    {
      title: "Formulators & wholesalers",
      body: "Raw African Black Soap crumble by the quarter-tonne. Palm kernel oil, cocoa pod ash, shea and cocoa butter.",
      detail: "Sold by the 250kg",
    },
  ];

  return (
    <>
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <PageHero
        eyebrow="Trade and wholesale"
        title={
          <>
            Sell <span className="text-gilt">Efe Organics</span>
          </>
        }
        intro="We supply salons, pharmacies, market traders and formulators across Ghana. From shelf-ready retail packs to raw black soap by the quarter-tonne."
        action={
          <a
            href="#enquire"
            className="group inline-flex items-center gap-2 rounded-full bg-saffron-light px-7 py-3.5 font-semibold text-forest-deep transition-transform active:scale-[0.98]"
          >
            Start an enquiry
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </a>
        }
      />

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

                {/*
                  This section listed a GH₵13,750 product with its price and
                  ingredients and then stopped, which made the single most
                  commercially interesting SKU in the range a dead end.

                  The action is an enquiry, NOT a product page. Bulk SKUs are
                  deliberately off the consumer shelf (lib/catalog), so
                  /shop/<crumble-slug> is a 404 by design, and it should stay
                  that way: nobody buys a quarter tonne through a web checkout
                  that cannot quote delivery on it. The link carries what they
                  came for so the conversation can skip its second question.
                */}
                <Link
                  href="/partners?want=crumble#enquire"
                  scroll
                  className="group mt-7 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 font-semibold text-paper transition-transform active:scale-[0.98]"
                >
                  Enquire about bulk supply
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
                <p className="mt-3 text-xs/5 text-muted">
                  Priced on volume and destination. We come back with real
                  numbers, usually within a working day.
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
              seed={seed}
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
