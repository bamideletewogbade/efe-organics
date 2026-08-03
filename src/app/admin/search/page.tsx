import Link from "next/link";

import { Empty, PageHeader, Pill } from "@/components/admin/AdminUI";
import { adminSearch } from "@/db/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

const KIND_LABEL = {
  order: "Order",
  product: "Product",
  customer: "Customer",
} as const;

/**
 * Search results.
 *
 * Orders come first in the list because that is overwhelmingly what someone is
 * looking for when they search here: a customer is on the phone quoting a
 * reference. Products and customers follow. The ordering is set in the query
 * rather than sorted by relevance score, since with three known categories an
 * intent ranking beats a text-match ranking every time.
 */
export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const hits = await adminSearch(query);

  return (
    <div>
      <PageHeader
        title={query ? `Results for "${query}"` : "Search"}
        description="Order references, customer names and phone numbers, product names."
        meta={
          query.length >= 2
            ? `${hits.length} ${hits.length === 1 ? "match" : "matches"}`
            : undefined
        }
      />

      {query.length < 2 ? (
        <Empty
          title="Type at least two characters"
          body="Search covers orders, products and customers. Press the / key from anywhere in the admin to jump to the box."
        />
      ) : hits.length === 0 ? (
        <Empty
          title="Nothing found"
          body={`No order, product or customer matches "${query}". Order references look like EFE-4K2P9-A7QX.`}
        />
      ) : (
        <ul className="mt-6 grid gap-2">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.href}`}>
              <Link
                href={hit.href}
                className="group flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-raised p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40"
              >
                <Pill tone={hit.kind === "order" ? "info" : "neutral"}>
                  {KIND_LABEL[hit.kind]}
                </Pill>
                <span
                  className={`min-w-0 flex-1 font-medium text-strong ${
                    hit.kind === "order" ? "ref" : ""
                  }`}
                >
                  {hit.title}
                </span>
                <span className="text-xs text-muted">{hit.detail}</span>
                <span
                  aria-hidden
                  className="text-muted transition-transform group-hover:translate-x-0.5"
                >
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
