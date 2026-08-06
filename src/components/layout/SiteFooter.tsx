import Link from "next/link";

import { brand } from "@/lib/brand";
import { POLICIES } from "@/lib/legal";
import { CATEGORIES } from "@/lib/catalog";
import { Container } from "./Container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    /**
     * No top margin.
     *
     * `mt-24` used to sit here, which produced a band of page background between
     * the last section and the footer, very visible when that section is also
     * dark, as on /about, where it read as a rendering fault rather than
     * spacing. Sections own their own bottom padding; the footer butts straight
     * up against whatever precedes it.
     */
    <footer className="on-dark bg-forest-deep">
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            {brand.legalName}
          </p>
          <p className="mt-1 text-sm text-gold">{brand.tagline}</p>
          <p className="measure mt-5 text-sm/6 text-paper/70">
            {brand.description}
          </p>
          <p className="mt-6 text-sm text-paper/70">
            {brand.contact.city}, {brand.contact.country} &middot;{" "}
            <a
              href={`mailto:${brand.contact.email}`}
              className="underline underline-offset-4 hover:text-gold"
            >
              {brand.contact.email}
            </a>
          </p>
        </div>

        <nav aria-label="Shop">
          <h2 className="text-xs uppercase tracking-widest text-gold">Shop</h2>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/collections/${category.slug}`}
                  className="hover:text-gold"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="text-xs uppercase tracking-widest text-gold">
            Company
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            <li>
              <Link href="/about" className="hover:text-gold">
                Our story
              </Link>
            </li>
            <li>
              <Link href="/stockists" className="hover:text-gold">
                Where to buy
              </Link>
            </li>
            <li>
              <Link href="/partners" className="hover:text-gold">
                Sell Efe Organics
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-gold">
                Contact
              </Link>
            </li>
          </ul>

          {/*
            Policies belong in the footer, not the nav. A shopper looks for them
            here, and a shop that takes money is expected to have them findable
            from every page. Generated from lib/legal so adding a fifth policy
            does not require remembering to link it.
          */}
          <h2 className="mt-7 text-xs uppercase tracking-widest text-gold">
            Policies
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            {POLICIES.map((policy) => (
              <li key={policy.slug}>
                <Link
                  href={`/policies/${policy.slug}`}
                  className="hover:text-gold"
                >
                  {policy.title}
                </Link>
              </li>
            ))}
          </ul>

          {/* Social lives under Company rather than as its own column: three
              icons do not justify a quarter of the footer. */}
          <ul className="mt-6 flex gap-3">
            {[
              { label: "Instagram", href: brand.social.instagram },
              { label: "Facebook", href: brand.social.facebook },
              { label: "TikTok", href: brand.social.tiktok },
            ].map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/20 text-[0.62rem] font-semibold text-paper/70 transition-colors hover:border-saffron hover:text-accent"
                >
                  <span aria-hidden>{social.label.slice(0, 2)}</span>
                  <span className="sr-only">
                    {brand.name} on {social.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      {/*
        Trust row. A shop footer's real job is answering the last three doubts
        before someone commits: can I pay how I pay, will it reach me, is this
        thing real. Stated plainly rather than as badge images, no logos we do
        not have permission to use, and it stays legible at any size.
      */}
      <div className="border-t border-paper/10">
        <Container className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5 text-xs text-paper/65">
          {[
            "MTN & Telecel mobile money",
            "Visa & Mastercard",
            "Delivery across Ghana",
            "Handcrafted in Accra",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 8.5 3.2 3.2L13 5" />
              </svg>
              {item}
            </span>
          ))}
        </Container>
      </div>

      <div className="border-t border-paper/10">
        <Container className="flex flex-col gap-3 py-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {brand.legalName}. All rights reserved.
          </p>
          <p>Made in {brand.contact.country}.</p>
        </Container>
      </div>
    </footer>
  );
}
