import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";

import { brand } from "@/lib/brand";
import { capabilities, env } from "@/lib/env";
import "./globals.css";

/**
 * Root layout, the DOCUMENT ONLY.
 *
 * Fonts, the theme script, `<html>` and `<body>`. Nothing visual, because this
 * wraps the storefront AND the admin, and those two share a document but not a
 * single piece of chrome.
 *
 * Header, footer, cart and analytics live in `(shop)/layout.tsx`; the admin
 * brings its own sidebar. Keeping them here is what made `/admin` render a shop
 * header and a basket icon over the back office.
 *
 * Fonts are SELF-HOSTED rather than pulled via `next/font/google`: that helper
 * fetches at BUILD time and this environment cannot reach Google, so every build
 * died on "Failed to fetch". Self-hosting removes the network from the build and
 * is faster for users. Refresh with `node scripts/fetch-fonts.mjs`.
 */

/** Display: warm, slightly irregular. Carries headlines and product names. */
const bricolage = localFont({
  src: "./fonts/bricolage-variable.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

/** Body, labels and prices. Its numerals stay unambiguous at 12px. */
const figtree = localFont({
  src: "./fonts/figtree-variable.woff2",
  variable: "--font-figtree",
  display: "swap",
  weight: "200 800",
});

/**
 * Identifiers only: order references and SKUs.
 *
 * An order reference gets read down a phone. Figtree does not distinguish 0
 * from O, or 1 from l from I, which at 12px in a table is a real source of
 * "she read it back wrong". JetBrains Mono has a slashed zero and disambiguated
 * letterforms. Deliberately NOT used for prices, where Figtree's tabular
 * figures already align and a monospace would look like a terminal.
 */
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-variable.woff2",
  // Named for the face, not the role: `--font-mono` is the semantic token in
  // globals.css and would otherwise reference itself.
  variable: "--font-mono-jetbrains",
  display: "swap",
  weight: "400 700",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.public.siteUrl),
  title: {
    default: `${brand.name} · ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  openGraph: {
    title: `${brand.name} · ${brand.tagline}`,
    description: brand.description,
    url: brand.url,
    siteName: brand.name,
    locale: "en_GH",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GH"
      className={`${bricolage.variable} ${figtree.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Script id="efe-theme" strategy="beforeInteractive">
          {`(function(){try{document.documentElement.dataset.theme=localStorage.getItem("efe-theme")==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`}
        </Script>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-forest focus:px-5 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {capabilities.hasClerk ? (
          <ClerkProvider publishableKey={env.public.clerkPublishableKey}>
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
