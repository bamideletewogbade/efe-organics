import { Card, PageHeader } from "@/components/admin/AdminUI";
import { EXPORTS, type ExportKind } from "@/lib/export";

export const dynamic = "force-dynamic";
export const metadata = { title: "Export" };

/**
 * Export.
 *
 * WHY THIS SCREEN EXISTS AT ALL
 *
 * The argument for leaving Ecwid is that Efe should own its shop. A system you
 * cannot walk away from is not owned, and until this page existed, everything
 * Alberta put in here was easier to get into than out of, which is exactly the
 * position she is being asked to leave.
 *
 * So this is partly a feature and partly a promise being kept in public. It is
 * also the honest answer to "what if we stop working together", which is a
 * question worth being able to answer before it is asked.
 *
 * The delimiter choice is here because Ecwid's own export dialog offers one, and
 * whoever is used to that will look for it. Semicolon is also what Excel expects
 * in a lot of locales.
 */
export default function AdminExportPage() {
  const kinds = Object.keys(EXPORTS) as ExportKind[];

  return (
    <div>
      <PageHeader
        title="Export"
        description="Take everything with you, any time, in a format any other system can read."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {kinds.map((kind) => (
          <Card key={kind}>
            <h2 className="font-semibold text-strong">{EXPORTS[kind].label}</h2>
            <p className="measure mt-1.5 text-sm/6 text-muted">
              {EXPORTS[kind].blurb}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`/admin/export/download?kind=${kind}`}
                download
                className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-mid"
              >
                Download CSV
              </a>
              <a
                href={`/admin/export/download?kind=${kind}&delimiter=semicolon`}
                download
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-strong transition-colors hover:border-accent/50"
              >
                Semicolon version
              </a>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <h2 className="font-semibold text-strong">Notes on the files</h2>
        <ul className="measure mt-4 space-y-3 text-sm/6 text-muted">
          <li>
            <strong className="text-strong">Money is in cedis</strong>, with two
            decimals, not the pesewas used internally. A GH₵15 bar exports as
            15.00.
          </li>
          <li>
            <strong className="text-strong">Dates are ISO</strong>{" "}
            (2026-08-03T14:22:00Z). It is the one format Excel, Google Sheets and
            a re-import all agree on. Day-first dates get silently reinterpreted
            as American ones, which shifts a year of history.
          </li>
          <li>
            <strong className="text-strong">Order lines are separate</strong>{" "}
            from orders. Anything asking what sells needs the lines file; the
            orders file can only tell you how much sold.
          </li>
          <li>
            <strong className="text-strong">Use the semicolon version</strong> if
            the plain one opens in Excel with everything crammed into column A.
            That is a locale setting, not a broken file.
          </li>
        </ul>
      </Card>
    </div>
  );
}
