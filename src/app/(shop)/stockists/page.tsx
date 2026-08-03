import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHero } from "@/components/layout/PageHero";
import { brand } from "@/lib/brand";
import { countProducts } from "@/lib/catalog";
import { breadcrumbJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Where to buy",
  description: `Where to buy ${brand.name} in Ghana. Authorised retailers and stockists for African Black Soap, herbal hair care and natural body care.`,
  path: "/stockists",
});

/**
 * Where to buy.
 *
 * ONE confirmed channel exists today. The obvious temptation on a page like this
 * is to fill a grid with plausible-looking retailers, which would be inventing
 * business relationships. So the page is built around the single real channel
 * and is explicit that the stockist network is still forming. That is a weaker
 * page and an honest one, and it converts the gap into the recruitment ask.
 *
 * Replace the placeholder copy with a real directory once Efe supplies the
 * stockist list (docs/OPEN-QUESTIONS.md).
 */
export default async function StockistsPage() {
  const total = await countProducts();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Where to buy", path: "/stockists" },
  ];

  return (
    <>
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <PageHero
        eyebrow="Where to buy"
        title={
          <>
            Find <span className="text-gilt">Efe Organics</span>
          </>
        }
        intro={`Our full range of ${total} products is available online through our authorised retailer, with delivery across Ghana.`}
      />

      {/* ---- the confirmed channel ---- */}
      <section className="py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="rounded-3xl border border-line bg-surface-raised p-8 sm:p-10">
              <span className="eyebrow inline-block rounded-full bg-saffron/12 px-3 py-1.5 text-[0.6rem] text-accent">
                Authorised retailer
              </span>
              <h2 className="mt-5 text-3xl">Coloursbay</h2>
              <p className="measure mt-4 text-base/7 text-muted">
                Coloursbay carries the complete Efe Organics range online, ships
                across Ghana, and accepts mobile money as well as cards. Orders
                are typically processed within 24 hours.
              </p>

              <ul className="mt-6 flex flex-wrap gap-2">
                {["Full range", "Mobile money", "Card payment", "Ghana-wide delivery"].map(
                  (feature) => (
                    <li
                      key={feature}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-muted"
                    >
                      {feature}
                    </li>
                  ),
                )}
              </ul>

              <a
                href={brand.resellerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-7 py-3.5 font-semibold text-paper transition-transform active:scale-[0.98]"
              >
                Shop at Coloursbay
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </a>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl">
                Our stockist network is growing
              </h2>
              <p className="measure mt-4 text-base/7 text-muted">
                We are building a network of salons, pharmacies and retailers
                across Ghana. We would rather list nothing than list a shop that
                does not actually carry us, so this page will fill out as that
                network is confirmed.
              </p>
              <p className="measure mt-4 text-base/7 text-muted">
                Know a shop that should stock Efe? Or run one yourself?
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/partners"
                  className="rounded-full bg-saffron-light px-6 py-3 text-sm font-semibold text-forest-deep"
                >
                  Sell Efe Organics
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-strong transition-colors hover:border-accent/50"
                >
                  Suggest a stockist
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- direct ---- */}
      <section className="border-t border-line bg-surface-sunken py-16">
        <Container>
          <div className="measure">
            <h2 className="text-2xl sm:text-3xl">Buying direct</h2>
            <p className="mt-4 text-base/7 text-muted">
              Order the full range straight from us, with delivery across Ghana
              and mobile money or card at checkout. For bulk and salon
              quantities, our trade team will quote you directly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper"
              >
                Shop the range
              </Link>
              <Link
                href="/partners"
                className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-strong transition-colors hover:border-accent/50"
              >
                Bulk &amp; salon quantities
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
