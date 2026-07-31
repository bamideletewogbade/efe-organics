"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";

import { Wordmark } from "@/components/brand/Wordmark";
import { useCart } from "@/components/cart/CartProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { duration, easeSoft } from "@/components/motion/tokens";
import { brand } from "@/lib/brand";
import { Container } from "./Container";

export type NavCategory = { slug: string; name: string; count: number };

type NavLink = {
  href: string;
  label: string;
  /** Only Shop opens a panel, and it shows real category counts. */
  mega?: boolean;
};

/**
 * FLAT. The dropdown is gone, and so is the page that justified it.
 *
 * "Find Efe → Buy it / Sell it" failed on its own terms: the parent said
 * nothing, and the children were so short they became riddles. But renaming
 * them would have missed the real problem — **the site now sells directly.**
 * "Where to buy" was written when a reseller was the only way to get the
 * products. Offering it in the main nav of a shop that has its own checkout
 * asks the visitor to choose between buying here and buying somewhere else,
 * which is a strange thing to put in front of someone.
 *
 * So it moves to the footer, where a minor page belongs, and the nav becomes
 * four plain destinations with nothing to unfold.
 *
 * "Wholesale" over "Sell Efe Organics": it is the word a salon owner or a
 * pharmacy buyer already uses and searches for. The page itself is still headed
 * "Sell Efe Organics", which reads as the fuller sentence once you are there.
 */
const LINKS: NavLink[] = [
  { href: "/shop", label: "Shop", mega: true },
  { href: "/about", label: "Our story" },
  { href: "/partners", label: "Wholesale" },
  { href: "/contact", label: "Contact" },
];

/**
 * Site header.
 *
 * Shares the reference site's utility layout — search, currency, wishlist,
 * account, cart — because that arrangement is what shoppers expect and there is
 * no prize for being different about it. What is ours: a single gold pill that
 * slides between nav items on shared layout, a mega-menu that shows real
 * category counts rather than a plain list, and a bar that condenses on scroll
 * so the hero reads full-bleed.
 *
 * Nothing here is wired to a backend yet. Search, wishlist and cart are
 * presentational until Phase 2 — they are marked as such in the markup rather
 * than pretending to work.
 */
export function SiteHeader({ categories = [] }: { categories?: NavCategory[] }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const [condensed, setCondensed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [megaOpen, setMegaOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setCondensed(y > 60));

  const active = LINKS.find((l) => pathname === l.href)?.href ?? null;
  const marked = hovered ?? active;

  /**
   * The bar only floats transparent where there is a dark hero behind it — the
   * home page. Everywhere else the page ground is paper, and a transparent bar
   * would render paper text on paper. So off-home it is always the solid plate.
   */
  const floating = pathname === "/" && !condensed;

  return (
    <motion.header
      /**
       * No `border-b`.
       *
       * A bottom border sits OUTSIDE the animated height, so the header measured
       * 97px while `--header-h` said 96px — and `.under-header` pulled the hero
       * up by exactly 96px, leaving a 1px line of paper background above the
       * dark hero. Small, but it read as a rendering fault at the very top of
       * the landing page.
       *
       * The hairline is now a `box-shadow`, which paints without occupying
       * layout, so the element's height is exactly the value we animate and the
       * token stays true.
       */
      className="sticky top-0 z-50"
      initial={false}
      animate={{
        // Deep forest (#0d2c1d) — the anchor, matching the hero and footer.
        backgroundColor: floating ? "rgb(13 44 29 / 0)" : "rgb(13 44 29 / 0.94)",
        boxShadow: floating
          ? "0 1px 0 0 rgb(217 143 20 / 0)"
          : "0 1px 0 0 rgb(217 143 20 / 0.28)",
        backdropFilter: floating ? "blur(0px)" : "blur(14px)",
      }}
      transition={{ duration: duration.base, ease: easeSoft }}
      onMouseLeave={() => {
        setHovered(null);
        setMegaOpen(false);
      }}
    >
      <Container>
        <motion.div
          className="flex items-center gap-4"
          initial={false}
          /* 96/70 rather than 76/62. The monogram is 56px tall, which left it
             sitting 10px off the top edge — visibly cramped against the browser
             chrome. The bar now gives it real air, and still condenses on scroll
             so the hero is not permanently squeezed. */
          animate={{ height: condensed ? 70 : 96 }}
          transition={{ duration: duration.base, ease: easeSoft }}
        >
          <Link
            href="/"
            aria-label={`${brand.name} — home`}
            className="shrink-0 transition-transform duration-200 active:scale-[0.97]"
            onClick={() => setMenuOpen(false)}
          >
            <Wordmark onDark />
          </Link>

          {/* ---- primary nav ---- */}
          {/* `ml-10` — the mark is ornate and needs breathing room, otherwise
              "Shop" crowds the descender of the monogram's swash. */}
          <nav aria-label="Primary" className="ml-10 hidden lg:block">
            <ul className="flex items-center">
              {LINKS.map((link) => (
                <li
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => {
                    setHovered(link.href);
                    setMegaOpen(Boolean(link.mega));
                  }}
                >
                  <Link
                    href={link.href}
                    onFocus={() => setHovered(link.href)}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`relative block px-3.5 py-2 text-sm transition-colors duration-200 ${
                      marked === link.href ? "text-paper" : "text-paper/65"
                    }`}
                  >
                    {link.label}
                  </Link>

                  {marked === link.href && (
                    <motion.span
                      layoutId="nav-pill"
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full bg-saffron/12 ring-1 ring-saffron/30"
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 34 }
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* ---- search ---- */}
          <form
            role="search"
            className="ml-auto hidden max-w-xs flex-1 md:block"
            onSubmit={(e) => e.preventDefault()}
          >
            <label className="sr-only" htmlFor="site-search">
              Search products
            </label>
            <div className="group flex items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-4 py-2 transition-colors focus-within:border-saffron/50 hover:border-paper/30">
              <svg
                viewBox="0 0 20 20"
                aria-hidden
                className="h-4 w-4 shrink-0 text-paper/45 transition-colors group-focus-within:text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 3.5 3.5" strokeLinecap="round" />
              </svg>
              <input
                id="site-search"
                type="search"
                placeholder="Search black soap, shampoo…"
                className="w-full bg-transparent text-sm text-paper placeholder:text-paper/40 focus:outline-none"
              />
            </div>
          </form>

          {/* ---- utilities ---- */}
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {/* The GHS/flag chip was removed: it implied a currency switcher
                that does not exist. Everything is priced in cedis and the site
                serves Ghana — stating it in the header was noise pretending to
                be a control. */}
            <ThemeToggle />

            <IconButton label="Saved items">
              <path d="M10 17s-6-3.9-6-8a3.4 3.4 0 0 1 6-2.1A3.4 3.4 0 0 1 16 9c0 4.1-6 8-6 8Z" />
            </IconButton>
            <IconButton label="Account">
              <circle cx="10" cy="7" r="3" />
              <path d="M4.5 16.5a5.5 5.5 0 0 1 11 0" />
            </IconButton>

            <CartButton />

            {/* ---- mobile trigger ---- */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-paper transition-colors hover:bg-paper/10 lg:hidden"
            >
              <span className="relative block h-3.5 w-5">
                <motion.span
                  className="absolute left-0 block h-px w-full bg-current"
                  animate={menuOpen ? { top: "50%", rotate: 45 } : { top: 0, rotate: 0 }}
                  transition={{ duration: duration.base, ease: easeSoft }}
                />
                <motion.span
                  className="absolute left-0 top-1/2 block h-px w-full bg-current"
                  animate={{ opacity: menuOpen ? 0 : 1 }}
                  transition={{ duration: duration.fast }}
                />
                <motion.span
                  className="absolute left-0 block h-px w-full bg-current"
                  animate={
                    menuOpen ? { bottom: "50%", rotate: -45 } : { bottom: 0, rotate: 0 }
                  }
                  transition={{ duration: duration.base, ease: easeSoft }}
                />
              </span>
            </button>
          </div>
        </motion.div>
      </Container>

      {/* ---- mega menu ---- */}
      <AnimatePresence>
        {megaOpen && categories.length > 0 && (
          <motion.div
            key="mega"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: duration.base, ease: easeSoft }}
            className="absolute inset-x-0 top-full hidden border-b border-saffron/15 bg-forest-deep/95 backdrop-blur-xl lg:block"
            onMouseEnter={() => setMegaOpen(true)}
          >
            <Container>
              <motion.ul
                className="grid grid-cols-3 gap-x-8 gap-y-1 py-6"
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.035 }}
              >
                {categories.map((category) => (
                  <motion.li
                    key={category.slug}
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: duration.base, ease: easeSoft }}
                  >
                    <Link
                      href={`/collections/${category.slug}`}
                      onClick={() => setMegaOpen(false)}
                      className="group flex items-baseline justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-saffron/10"
                    >
                      <span className="text-sm text-paper/85 transition-colors group-hover:text-accent">
                        {category.name}
                      </span>
                      <span className="stat text-xs text-paper/35">
                        {category.count}
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- mobile panel ---- */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav
            id="mobile-nav"
            aria-label="Primary"
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.base, ease: easeSoft }}
            className="overflow-hidden border-t border-paper/10 bg-forest-deep/97 backdrop-blur-xl lg:hidden"
          >
            <Container>
              <motion.ul
                className="flex flex-col py-2"
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.04, delayChildren: 0.05 }}
              >
                {[
                  /**
                   * The nav is flat, so the phone menu is simply the nav plus
                   * the six ranges. No nesting: on the surface where taps cost
                   * the most, an extra tap that reveals no new information is
                   * the worst trade in the whole interface.
                   */
                  ...LINKS.map((link) => ({
                    href: link.href,
                    label: link.label,
                  })),
                  ...categories.map((c) => ({
                    href: `/collections/${c.slug}`,
                    label: c.name,
                  })),
                ].map((item) => (
                  <motion.li
                    key={item.href}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: duration.base, ease: easeSoft }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between border-b border-paper/8 py-3.5 text-base text-paper/90 last:border-b-0"
                    >
                      {item.label}
                      <span aria-hidden className="text-accent">
                        &rarr;
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/**
 * Basket trigger + live count.
 *
 * The badge only renders once the cart has hydrated from localStorage. Rendering
 * a "0" first and then swapping to the real number is a visible flicker on every
 * page load for anyone with a basket, which is precisely the people who should
 * not be told their basket is empty.
 *
 * The count animates on change (`key={count}`) so adding an item registers even
 * when the drawer is closed — for instance when adding from a grid card.
 */
function CartButton() {
  const { count, hydrated, open } = useCart();
  const reduce = useReducedMotion();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={
        hydrated && count > 0
          ? `Basket, ${count} ${count === 1 ? "item" : "items"}`
          : "Basket, empty"
      }
      className="relative ml-1 flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h12l-1 10H5L4 6Z" />
        <path d="M7.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
      </svg>

      <AnimatePresence>
        {hydrated && count > 0 && (
          <motion.span
            key={count}
            aria-hidden
            initial={reduce ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 24 }}
            className="stat absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[0.6rem] text-forest-deep"
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="hidden h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper sm:flex"
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
