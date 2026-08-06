import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { PageHero } from "@/components/layout/PageHero";
import { getPolicy, NEEDS_REVIEW, POLICIES } from "@/lib/legal";
import { breadcrumbJsonLd, jsonLdScript, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return POLICIES.map((policy) => ({ slug: policy.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return {};

  return {
    ...pageMetadata({
      title: policy.title,
      description: policy.intro,
      path: `/policies/${policy.slug}`,
    }),
    /*
      Policies must never be a search result for the shop. They are also the
      pages most likely to be wrong while they are still drafts, so they stay
      out of the index until a human has signed them off.
    */
    robots: NEEDS_REVIEW ? { index: false, follow: true } : undefined,
  };
}

/**
 * One policy.
 *
 * All four share this page because they share a shape: a title, a plain-English
 * intro, and headed sections. Four near-identical files would have drifted apart
 * the way the page heroes did.
 *
 * THE REVIEW BANNER IS NOT DECORATION. These were drafted from how the shop
 * actually behaves, by someone unqualified to write them. Shipping unreviewed
 * policies quietly is the same failure as shipping invented testimonials: it
 * looks finished and is not.
 */
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  const trail = [
    { name: "Home", path: "/" },
    { name: policy.title, path: `/policies/${policy.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      <PageHero
        eyebrow="Policies"
        title={policy.title}
        intro={policy.intro}
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_2.2fr]">
            <nav aria-label="Policies" className="lg:sticky lg:top-28 lg:self-start">
              <p className="eyebrow text-[0.6rem] text-muted">All policies</p>
              <ul className="mt-4 grid gap-1">
                {POLICIES.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/policies/${entry.slug}`}
                      aria-current={entry.slug === policy.slug ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        entry.slug === policy.slug
                          ? "bg-surface-sunken font-semibold text-strong"
                          : "text-muted hover:bg-surface-sunken hover:text-strong"
                      }`}
                    >
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              {NEEDS_REVIEW && (
                <p className="measure mb-10 rounded-2xl border border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_8%,transparent)] p-5 text-sm/6 text-strong">
                  <strong>Draft, awaiting legal review.</strong> This describes
                  how the shop actually works today and is written in good faith,
                  but it has not been checked by anyone qualified in Ghanaian
                  consumer or data protection law. It should be before the shop
                  starts taking payment.
                </p>
              )}

              <div className="grid gap-10">
                {policy.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-xl sm:text-2xl">{section.heading}</h2>
                    <div className="mt-4 grid gap-4">
                      {section.body.map((paragraph) => (
                        <p
                          key={paragraph}
                          className="measure text-base/7 text-body"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
