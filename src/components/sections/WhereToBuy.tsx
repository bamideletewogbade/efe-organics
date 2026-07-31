"use client";

import { motion, useReducedMotion } from "motion/react";

import { Container } from "@/components/layout/Container";
import { duration, easeSoft } from "@/components/motion/tokens";

/**
 * "Where to buy" — Efe's answer to the reference site's partner-brands strip.
 *
 * The inversion matters. Coloursbay lists the brands it carries, because it is
 * a retailer. Efe is the manufacturer, so the equivalent section lists the
 * channels that carry Efe — which turns a vanity logo wall into something with
 * a job: it reassures a buyer the brand is real and stocked, and it advertises
 * the stockist programme to anyone who might want to join.
 *
 * Only Coloursbay is a confirmed channel today. Rather than pad the row with
 * invented retailers, the remaining tiles are honest recruitment slots.
 */

type Channel = {
  name: string;
  detail: string;
  href: string;
  external?: boolean;
  confirmed: boolean;
};

const CHANNELS: Channel[] = [
  {
    name: "Coloursbay",
    detail: "Authorised online retailer · Accra",
    href: "https://www.coloursbay.com",
    external: true,
    confirmed: true,
  },
  {
    name: "Salons & spas",
    detail: "1L professional formats, wholesale pricing",
    href: "/partners",
    confirmed: false,
  },
  {
    name: "Pharmacies & retail",
    detail: "Shelf-ready range, marketing kit included",
    href: "/partners",
    confirmed: false,
  },
  {
    name: "Formulators",
    detail: "Raw black soap crumble, sold by the tonne",
    href: "/partners",
    confirmed: false,
  },
];

export function WhereToBuy() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-line bg-surface py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-accent-quiet">Where to buy</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              Stocked across Ghana — and looking for more
            </h2>
          </div>
          <a
            href="/partners"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-accent"
          >
            Become a stockist
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </a>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((channel, index) => (
            <motion.li
              key={channel.name}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: duration.slow,
                ease: easeSoft,
                delay: index * 0.07,
              }}
            >
              <a
                href={channel.href}
                {...(channel.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface-raised p-6 transition-all duration-300 hover:-translate-y-1 hover:border-saffron/45 hover:shadow-[0_18px_40px_-24px_rgb(217_143_20_/_0.5)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-[family-name:var(--font-display)] text-xl text-strong">
                    {channel.name}
                  </p>
                  {channel.confirmed ? (
                    <span className="eyebrow shrink-0 rounded-full bg-saffron/15 px-2 py-1 text-[0.5rem] text-accent">
                      Live
                    </span>
                  ) : (
                    <span className="eyebrow shrink-0 rounded-full bg-oat px-2 py-1 text-[0.5rem] text-muted">
                      Open
                    </span>
                  )}
                </div>

                <p className="mt-2 flex-1 text-sm/6 text-muted">
                  {channel.detail}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                  {channel.confirmed ? "Visit" : "Apply"}
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </span>
              </a>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
