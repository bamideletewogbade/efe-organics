import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHero } from "@/components/layout/PageHero";
import { StoryComposition } from "@/components/sections/StoryComposition";
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
 * the brand deck, no invented history. The milestones are the deck's own
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

      {/*
        The masthead is now the shared PageHero, the same one Wholesale, Contact
        and Shop use. A full-height image-led opener made this page announce
        itself louder than the shop does, which is the wrong order of importance
        for a page about the company.

        The photography did not go to waste. It moved down into the mission
        section, where a picture of raw material beside a paragraph about
        manufacturing is doing work rather than decorating an entrance.
      */}
      <PageHero
        eyebrow={brand.story.heading}
        title={
          <>
            Rooted in African tradition,
            <br />
            <span className="text-gilt">made for every day.</span>
          </>
        }
        intro={brand.story.body[0]}
        meta={`Making soap in ${brand.contact.city} since 2012 · ${total} products · ${categories.length} ranges · ${ingredients.length} botanicals`}
        action={
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 rounded-full bg-saffron-light px-6 py-3 font-semibold text-forest-deep transition-transform active:scale-[0.98] sm:px-7 sm:py-3.5"
          >
            See what we make
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </Link>
        }
      />

      {/* ---- mission ---- */}
      <section className="py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl">What we set out to do</h2>
              <div className="mt-6 space-y-6">
                {brand.story.body.slice(1).map((paragraph) => (
                  <p key={paragraph} className="measure text-lg/8 text-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/*
              Raw material, then the finished product in someone's hand. It sits
              here rather than in the masthead because this is where the page
              talks about manufacturing, so the photographs are illustrating an
              argument instead of filling an entrance.
            */}
            <StoryComposition
              portrait={{
                src: "/products/green-herbal-scalp-oil-120ml/2.jpeg",
                alt: "A woman holding a bottle of Efe Organics Green Herbal Hair and Scalp Oil",
                width: 893,
                height: 1600,
                href: "/shop/green-herbal-hair-scalp-oil-120ml",
                label: "Green Herbal Hair & Scalp Oil",
              }}
              /*
                The small plate cycles through the soap's own three stages. It
                is the honest form of the before-and-after a beauty page reaches
                for: the transformation shown is the product's, which is real and
                photographed, rather than a face's, which would not be.
              */
              textures={[
                {
                  src: "/products/pure-african-black-soap-crumble-250kgs/1.jpg",
                  alt: "Raw African Black Soap crumble, freshly made",
                  width: 756,
                  height: 756,
                  label: "Ash, oil and butter",
                },
                {
                  src: "/products/pure-african-black-soap-crumble-250kgs/3.png",
                  alt: "African Black Soap crumble packed for wholesale",
                  width: 1600,
                  height: 1600,
                  label: "Cured and packed",
                },
                {
                  src: "/products/sweet-lavender-2-1l/1.jpeg",
                  alt: "A finished bottle of Efe Organics Sweet Lavender black soap bath beside fresh lavender",
                  width: 893,
                  height: 1600,
                  label: "Finished and bottled",
                },
              ]}
            />
          </div>
        </Container>
      </section>

      {/* The numbers band that used to sit here now runs along the bottom of
          the masthead. Keeping both would have said the same four facts twice
          within one screen of each other. */}

      {/* ---- values ---- */}
      <section className="py-20">
        <Container>
          <p className="eyebrow text-accent-quiet">What we stand on</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Not a mission statement, a way of working
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
                body: "Efe Organic Cosmetics becomes Efe Organics. A broader market, and a clearer identity as a premium organic skin and hair care maker.",
              },
              {
                year: "2027",
                title: "New product categories",
                body: "Innovative organic formulations beyond the flagship African Black Soap line, into new territory in hair and skin wellness.",
              },
              {
                year: "2028",
                title: "Domestic & international",
                body: "New markets at home and abroad, through retail partnerships and digital platforms. Authentic African organic beauty, globally.",
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
