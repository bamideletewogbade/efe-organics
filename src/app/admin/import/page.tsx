import { desc } from "drizzle-orm";

import { PageHeader, Pill } from "@/components/admin/AdminUI";
import { ImportWizard } from "@/components/admin/ImportWizard";
import { getDb } from "@/db/client";
import { importBatches } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import" };

/**
 * Bring the old business in.
 *
 * This screen is what makes the AI work possible. Every useful thing a model
 * could do here (what to restock, who to call, what to write about a product)
 * is calculated from sales history, and a shop that opened last week has none.
 * A spreadsheet from the previous system is years of it, and importing takes an
 * afternoon rather than a year of trading.
 */
export default async function AdminImportPage() {
  const db = getDb();
  const history = db
    ? await db
        .select()
        .from(importBatches)
        .orderBy(desc(importBatches.createdAt))
        .limit(10)
    : [];

  return (
    <div>
      <PageHeader
        title="Import your history"
        description="Move orders, customers and prices out of your old system and into this one. Bring the history and everything else starts working."
      />

      <ImportWizard />

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Previous imports
          </h2>
          <ul className="mt-4 grid gap-2">
            {history.map((batch) => {
              const report = batch.report as
                | { skipped?: Array<{ row: number; reason: string }> }
                | null;
              const skipped = report?.skipped ?? [];

              return (
                <li
                  key={batch.id}
                  className="rounded-xl border border-line bg-surface-raised p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-medium text-strong">
                      {batch.filename}
                    </span>
                    <Pill
                      tone={
                        batch.status === "committed"
                          ? batch.rowsSkipped > 0
                            ? "warn"
                            : "good"
                          : batch.status === "failed"
                            ? "bad"
                            : "neutral"
                      }
                    >
                      {batch.status}
                    </Pill>
                    <span className="stat text-sm text-muted">
                      {batch.rowsImported} in
                      {batch.rowsSkipped > 0 && `, ${batch.rowsSkipped} skipped`}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(batch.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* The reasons matter more than the count. "412 of 500" is
                      the start of an argument; a list of rows and why is a
                      thing the owner can go and fix. */}
                  {skipped.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-strong">
                        Why {skipped.length} row
                        {skipped.length === 1 ? " was" : "s were"} skipped
                      </summary>
                      <ul className="mt-2 grid gap-1 text-xs text-muted">
                        {skipped.slice(0, 25).map((item, index) => (
                          <li key={index}>
                            Row {item.row}: {item.reason}
                          </li>
                        ))}
                        {skipped.length > 25 && (
                          <li>and {skipped.length - 25} more</li>
                        )}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
