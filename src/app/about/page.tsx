import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { brand } from "@/lib/brand";
import { countProducts, listCategories, listIngredients } from "@/lib/catalog";
import { breadcrumbJsonLd, jsonLdScript, organizationJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our story",
  description: `${brand.story.body[0]} ${brand.description}`,
  path: "/about",
});

/**
 * Our story.
 *
 * Every word of narrative comes from `lib/brand.ts`, which in turn comes from
 * the brand deck — no invented history. The milestones are the deck's own
 * 2026/2027/2028 plan.
 *
 * The counts in the "by the numbers" strip are computed from the catalogue, not
 * typed in, so they cannot go stale when the range changes.
 */
export default async function AboutPage() {
  const [total, categories, ingredients] = await Promise.all([
    countProducts(),
    listCategories(),
    listIngredients(60),
  ]);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Our story", path: "/about" },
  ];

  return (
    <>
      <script {...jsonLdScript(organizationJsonLd())} />
      <script {...jsonLdScript(breadcrumbJsonLd(trail))} />

      {/* ---- masthead ---- */}
      <section className="on-dark relative under-header overflow-hidden bg-forest-deep">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-0 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_65%)] opacity-[0.13] blur-3xl"
        />
        <Container className="relative py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow text-accent-quiet">{brand.story.heading}</p>
              <h1 className="mt-5 text-4xl/[1.05] sm:text-5xl/[1.03] lg:text-6xl/[1.02]">
                Rooted in African tradition,
                <br />
                <span className="text-gilt">made for every day.</span>
              </h1>
              <p className="measure mt-7 text-lg/8 text-paper/72">
                {brand.story.body[0]}
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <Image
                src="/brand/mark-on-dark.png"
                alt={`${brand.legalName} monogram`}
                width={633}
                height={512}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ---- mission ---- */}
      <section className="py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl sm:text-4xl">What we set out to do</h2>
            <div className="space-y-6">
              {brand.story.body.slice(1).map((paragraph) => (
                <p key={paragraph} className="text-lg/8 text-body">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---- numbers ---- */}
      <section className="border-y border-line bg-surface-sunken py-16">
        <Container>
          <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: String(total), label: "Products in the range" },
              { value: String(categories.length), label: "Ranges" },
              { value: String(ingredients.length), label: "Botanicals we use" },
              { value: "2012", label: "Making soap since" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="sr-only">{item.label}</dt>
                <dd className="stat text-4xl text-accent">{item.value}</dd>
                <p className="mt-2 text-sm text-muted">{item.label}</p>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ---- values ---- */}
      <section className="py-20">
        <Container>
          <p className="eyebrow text-accent-quiet">What we stand on</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Not a mission statement — a way of working
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {brand.values.map((value, index) => (
              <div
                key={value.title}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface-raised p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
              >
                <span
                  aria-hidden
                  className="stat absolute right-6 top-5 text-5xl text-accent/10 transition-colors duration-300 group-hover:text-accent/20"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="relative text-xl">{value.title}</h3>
                <p className="relative mt-3 text-base/7 text-muted">
                  {value.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---- milestones (from the brand deck) ---- */}
      <section className="border-t border-line py-20">
        <Container>
          <p className="eyebrow text-accent-quiet">Where we are going</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">The plan, in three steps</h2>

          <ol className="mt-12 grid gap-8 lg:grid-cols-3">
            {[
              {
                year: "2026",
                title: "Rebrand & positioning",
                body: "Efe Organic Cosmetics becomes Efe Organics — a broader market, and a clearer identity as a premium organic skin and hair care maker.",
              },
              {
                year: "2027",
                title: "New product categories",
                body: "Innovative organic formulations beyond the flagship African Black Soap line, into new territory in hair and skin wellness.",
              },
              {
                year: "2028",
                title: "Domestic & international",
                body: "New markets at home and abroad, through retail partnerships and digital platforms — authentic African organic beauty, globally.",
              },
            ].map((step, index) => (
              <li key={step.year} className="relative pl-6">
                <span
                  aria-hidden
                  className="absolute left-0 top-2 h-2 w-2 rounded-full bg-accent"
                />
                {index < 2 && (
                  <span
                    aria-hidden
                    className="absolute left-[3px] top-5 hidden h-full w-px bg-line lg:block"
                  />
                )}
                <p className="stat text-sm text-accent-quiet">{step.year}</p>
                <h3 className="mt-2 text-xl">{step.title}</h3>
                <p className="mt-3 text-base/7 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---- CTA ---- */}
      <section className="on-dark relative overflow-hidden bg-forest-deep">
        <Container className="relative flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl">See what we make</h2>
            <p className="measure mt-2 text-paper/70">
              {total} products across {categories.length} ranges, handcrafted in{" "}
              {brand.contact.city}.
            </p>
          </div>
          <Link
            href="/shop"
            className="group shrink-0 rounded-full bg-saffron-light px-7 py-3.5 font-semibold text-forest-deep transition-transform active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              Shop the range
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </span>
          </Link>
        </Container>
      </section>
    </>
  );
}
