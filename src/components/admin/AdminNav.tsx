"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { signOutAction } from "@/app/admin/actions";

/**
 * Admin sidebar.
 *
 * Ordered by how often the job actually needs it — orders and stock are the
 * daily work, settings is monthly. Alphabetical or "logical" ordering optimises
 * for the person who built it, not the person using it every morning.
 *
 * A rail on desktop, a scrolling strip on mobile: the owner will check orders on
 * a phone far more often than she will edit a product on one.
 */
const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function AdminNav({ devBypass }: { devBypass: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Admin"
      className="shrink-0 border-b border-line bg-forest-deep lg:min-h-svh lg:w-60 lg:border-b-0 lg:border-r"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block">
        <Link href="/admin" className="block">
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-paper">
            Efe
          </span>
          <span className="ml-2 text-xs uppercase tracking-[0.2em] text-gold">
            Admin
          </span>
        </Link>
      </div>

      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:overflow-visible lg:px-3">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="relative shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
                  active
                    ? "text-forest-deep"
                    : "text-paper/60 hover:text-paper"
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
        })}
      </ul>

      <div className="hidden px-5 py-4 lg:mt-auto lg:block">
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
    </nav>
  );
}
