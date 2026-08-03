import Link from "next/link";

import { Hero } from "@/components/hero/Hero";
import { Container } from "@/components/layout/Container";
import { ProductRail } from "@/components/sections/ProductRail";
import { Testimonials } from "@/components/sections/Testimonials";
import { WhereToBuy } from "@/components/sections/WhereToBuy";
import { brand } from "@/lib/brand";
import {
  countProducts,
  listCategories,
  listIngredients,
  listShelf,
  priceRange,
} from "@/lib/catalog";
import {
  BESTSELLERS_ARE_DERIVED,
  BESTSELLER_KEYS,
} from "@/lib/merchandising";
import { formatPriceShort } from "@/lib/money";

export default async function HomePage() {
  const [shelf, flagship, categories, total, range, ingredients] =
    await Promise.all([
      listShelf(),
      listShelf({ line: "flagship", limit: 4 }),
      listCategories(),
      countProducts(),
      priceRange(),
      listIngredients(),
    ]);

  const bestsellers = BESTSELLER_KEYS.map((key) =>
    shelf.find((group) => group.key === key),
  ).filter((group): group is (typeof shelf)[number] => Boolean(group));

  return (
    <>
      <Hero
        tagline={brand.tagline}
        promiseLead="Nature, in your"
        promiseAccent="everyday life."
        city={brand.contact.city}
        fromPrice={`GH₵${formatPriceShort(range.min)}`}
        productCount={total}
        ingredients={ingredients}
      />

      <ProductRail
        eyebrow="Best sellers"
        title="What people reach for first"
        intro="The products we make in the most formats. From a GH₵15 bar to a one-litre refill."
        note={
          BESTSELLERS_ARE_DERIVED
            ? "Ranking derived from range breadth, not sales data. To be confirmed with real order history."
            : undefined
        }
        groups={bestsellers}
        href="/shop"
        hrefLabel="Shop all"
      />

      <ProductRail
        eyebrow="Our flagship line"
        title="Authentic African Black Soap"
        intro="Deeply cleanses, balances skin tone and soothes irritation, in over twenty natural varieties."
        groups={flagship}
        href="/collections/black-soap"
        hrefLabel="See all black soap"
        tone="tint"
      />

      {/* Ranges ----------------------------------------------------------- */}
      <section className="py-20">
        <Container>
          <p className="eyebrow text-accent-quiet">Shop by range</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Six ways in</h2>

          <div className="reveal-group mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/collections/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface-raised p-6 transition-all duration-300 hover:-translate-y-1 hover:border-saffron/45 hover:shadow-[0_18px_44px_-26px_rgb(217_143_20_/_0.5)]"
              >
                {/* Leaf wash that grows from the corner on hover. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 scale-0 rounded-full bg-saffron/10 transition-transform duration-500 ease-out group-hover:scale-100"
                />
                <div className="relative">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl text-strong">{category.name}</h3>
                    <span className="stat text-sm text-accent">
                      {category.count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm/6 text-muted">{category.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                    Browse
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      &rarr;
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <Testimonials />

      <WhereToBuy />

      {/* Values ----------------------------------------------------------- */}
      <section className="py-20">
        <Container>
          <p className="eyebrow text-accent-quiet">Why choose us</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Quality is the foundation, not the finish
          </h2>
          <dl className="reveal-group mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {brand.values.map((value) => (
              <div key={value.title} className="border-t border-line pt-5">
                <dt className="font-[family-name:var(--font-display)] text-lg text-strong">
                  {value.title}
                </dt>
                <dd className="mt-2 text-sm/6 text-muted">{value.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Stockist call ----------------------------------------------------- */}
      <section className="on-dark relative overflow-hidden bg-forest-deep">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--color-saffron-light)_0%,transparent_70%)] opacity-[0.14] blur-3xl"
        />
        <Container className="relative flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl">Sell {brand.name}</h2>
            <p className="measure mt-2 text-paper/70">
              Salons, pharmacies and market traders across Ghana stock our
              range. Join them for wholesale pricing and a ready-made marketing
              kit.
            </p>
          </div>
          <Link
            href="/partners"
            className="group shrink-0 rounded-full bg-saffron-light px-7 py-3.5 font-semibold text-forest-deep shadow-[0_10px_30px_-10px_var(--color-saffron-light)] transition-transform duration-200 active:scale-[0.975]"
          >
            <span className="flex items-center gap-2">
              Sell Efe Organics
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
