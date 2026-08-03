"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { signOutAction } from "@/app/admin/actions";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Wordmark } from "@/components/brand/Wordmark";
import { brand } from "@/lib/brand";

/**
 * Admin sidebar.
 *
 * GROUPED BY WHEN YOU NEED IT, NOT BY WHAT IT IS.
 *
 * This was eight flat items, which is past the point a flat list works, and the
 * flatness hid two real problems. Settings (opened monthly) sat with the same
 * weight as Orders (opened hourly). And Products and Stock were adjacent peers
 * despite being the same objects viewed two ways, so it was never obvious which
 * one you wanted.
 *
 * The groups answer "what am I doing right now": *Today* is the morning routine,
 * *Catalogue* is what the shop sells, *Business* is how it is going. Settings is
 * deliberately outside all three, at the bottom, because configuring the shop is
 * not a task you come here to do.
 *
 * On mobile the groups collapse to one scrolling strip. Group headings on a
 * 375px-wide bar would cost more room than they earn, and someone checking
 * orders on a phone already knows what they came for.
 */
const GROUPS: Array<{ label: string; links: Array<{ href: string; label: string; exact?: boolean }> }> = [
  {
    label: "Today",
    links: [
      { href: "/admin", label: "Overview", exact: true },
      { href: "/admin/orders", label: "Orders" },
    ],
  },
  {
    label: "Catalogue",
    links: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/stock", label: "Stock" },
      { href: "/admin/promotions", label: "Promotions" },
    ],
  },
  {
    label: "Business",
    links: [
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/documents", label: "Documents" },
      { href: "/admin/import", label: "Import" },
      { href: "/admin/export", label: "Export" },
    ],
  },
];

const SETTINGS = { href: "/admin/settings", label: "Settings" };

export function AdminNav({
  devBypass,
  dbReady,
}: {
  devBypass: boolean;
  dbReady: boolean;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const item = (link: { href: string; label: string; exact?: boolean }) => {
    const active = isActive(link.href, link.exact);
    return (
      <li key={link.href} className="relative shrink-0 lg:shrink">
        <Link
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={`relative block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
            active ? "text-forest-deep" : "text-paper/60 hover:text-paper"
          }`}
        >
          <span className="relative z-10">{link.label}</span>
        </Link>
        {active && (
          <motion.span
            layoutId="admin-nav"
            aria-hidden
            className="absolute inset-0 rounded-lg bg-gold"
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 500, damping: 38 }
            }
          />
        )}
      </li>
    );
  };

  return (
    <nav
      aria-label="Admin"
      className="shrink-0 border-b border-line bg-forest-deep lg:flex lg:min-h-svh lg:w-60 lg:flex-col lg:border-b-0 lg:border-r"
    >
      {/*
        The real monogram, same asset the storefront uses, but paired with an
        "Admin" label rather than standing alone.

        That pairing is deliberate: the mark by itself would make this look like
        the shop, and the one thing a back office must never do is leave you
        unsure which side of the site you are on. The label is the disambiguator;
        the mark is the reassurance that it is still Efe.
      */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block">
        <Link
          href="/admin"
          className="flex items-center gap-3 transition-opacity hover:opacity-85"
          aria-label={`${brand.name} admin overview`}
        >
          <Wordmark onDark className="shrink-0" />
          <span className="border-l border-paper/20 pl-3 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-accent-quiet">
            Admin
          </span>
        </Link>
      </div>

      <div className="px-3 pb-3 lg:pb-0">
        <AdminSearch />
      </div>

      {/* Desktop: labelled groups. */}
      <div className="hidden lg:mt-4 lg:block">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-4 pb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-paper/35">
              {group.label}
            </p>
            <ul className="flex flex-col px-3">{group.links.map(item)}</ul>
          </div>
        ))}
      </div>

      {/* Mobile: one strip, no group headings. */}
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden">
        {GROUPS.flatMap((group) => group.links).map(item)}
        {item(SETTINGS)}
      </ul>

      <div className="hidden lg:mt-auto lg:block">
        <ul className="flex flex-col px-3">{item(SETTINGS)}</ul>

        {/*
          Environment warnings live here rather than as full-width bars above the
          page. Two stacked banners were costing roughly 100px on every single
          load to repeat something the operator already knew, which pushed the
          actual work below the fold on a laptop. They are still unmissable, they
          just stopped being the first thing on every screen.
        */}
        {(!dbReady || devBypass) && (
          <div className="mt-4 space-y-2 px-5 pb-4">
            {!dbReady && (
              <p className="rounded-lg bg-[color-mix(in_oklab,var(--progress)_22%,transparent)] px-3 py-2 text-[0.68rem]/4 text-paper/90">
                <span className="font-semibold">No database.</span> Screens stay
                empty until <code>DATABASE_URL</code> is set.
              </p>
            )}
            {devBypass && (
              <p className="rounded-lg bg-paper/8 px-3 py-2 text-[0.68rem]/4 text-paper/60">
                <span className="font-semibold">Unprotected.</span> No{" "}
                <code>ADMIN_PASSWORD</code> set. Locks itself in production.
              </p>
            )}
          </div>
        )}

        <div className="px-5 pb-4">
          <Link
            href="/"
            className="block text-xs text-paper/45 transition-colors hover:text-paper"
          >
            View shop &rarr;
          </Link>
          {!devBypass && (
            <form action={signOutAction} className="mt-3">
              <button
                type="submit"
                className="text-xs text-paper/45 transition-colors hover:text-paper"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
