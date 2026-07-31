import type { Metadata } from "next";
import Link from "next/link";

import { EnquiryConversation } from "@/components/forms/EnquiryConversation";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { CONTACT_SCRIPT } from "@/lib/enquiry";
import { Container } from "@/components/layout/Container";
import { brand } from "@/lib/brand";
import { breadcrumbJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Get in touch with ${brand.legalName} in ${brand.contact.city}, ${brand.contact.country} — orders, stockists, wholesale and general enquiries.`,
  path: "/contact",
});

export default function ContactPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <section className="on-dark under-header bg-forest-deep">
        <Container className="py-16 lg:py-20">
          <p className="eyebrow text-accent-quiet">Contact</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Talk to us</h1>
          <p className="measure mt-5 text-lg/8 text-paper/72">
            Questions about a product, an order, stocking the range, or anything
            else — we read everything.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-2xl">Direct</h2>
              <dl className="mt-5 space-y-5 text-sm">
                <div>
                  <dt className="font-semibold text-strong">Email</dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${brand.contact.email}`}
                      className="text-accent underline underline-offset-4"
                    >
                      {brand.contact.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-strong">Where we are</dt>
                  <dd className="mt-1 text-muted">
                    {brand.contact.city}, {brand.contact.country}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-strong">Social</dt>
                  <dd className="mt-1 text-muted">{brand.social.handle}</dd>
                </div>
              </dl>

              <div className="mt-9 rounded-2xl border border-line bg-surface-sunken p-6">
                <h3 className="text-base font-semibold text-strong">
                  Looking to stock Efe?
                </h3>
                <p className="mt-2 text-sm/6 text-muted">
                  Wholesale enquiries have their own page, with the formats and
                  quantities we supply.
                </p>
                <Link
                  href="/partners"
                  className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent"
                >
                  Sell Efe Organics
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              </div>
            </div>

            <EnquiryConversation
              script={CONTACT_SCRIPT}
              kind="general"
              fallback={
                <EnquiryForm
                  subjects={[
                    "A product question",
                    "An order",
                    "Stocking the range",
                    "Press or partnership",
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
