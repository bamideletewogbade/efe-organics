import { desc } from "drizzle-orm";

import {
  deleteDocumentAction,
  uploadDocumentAction,
} from "@/app/admin/import-actions";
import { Card, Empty, PageHeader, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { getDb } from "@/db/client";
import { documents } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

const KINDS = [
  { value: "price_list", label: "Price list" },
  { value: "supplier", label: "Supplier terms" },
  { value: "certificate", label: "Certificate or licence" },
  { value: "financial", label: "Financial record" },
  { value: "brand", label: "Brand material" },
  { value: "data_export", label: "Export from another system" },
  { value: "other", label: "Something else" },
] as const;

const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

const field =
  "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The business's paperwork.
 *
 * Separate from Import on purpose. Import turns a spreadsheet into rows the
 * shop can use; this is for everything that is not a spreadsheet, and its job
 * is only to hold the file safely and let someone find it later.
 *
 * It is also the grounding material for anything AI. A price list and a
 * certificate are facts, and the difference between an assistant worth having
 * and one that invents claims about a cosmetic is whether it was given facts to
 * work from.
 */
export default async function AdminDocumentsPage() {
  const db = getDb();
  const rows = db
    ? await db
        .select({
          id: documents.id,
          name: documents.name,
          kind: documents.kind,
          mimeType: documents.mimeType,
          sizeBytes: documents.sizeBytes,
          notes: documents.notes,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .orderBy(desc(documents.createdAt))
    : [];

  const total = rows.reduce((sum, row) => sum + row.sizeBytes, 0);

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Price lists, certificates, supplier terms, anything the business runs on. Upload it here so it is in one place and not in somebody's inbox."
        meta={
          rows.length > 0
            ? `${rows.length} files, ${readableSize(total)}`
            : undefined
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card className="self-start">
          <h2 className="font-semibold text-strong">Add a document</h2>
          <p className="mt-1.5 text-sm/6 text-muted">
            PDF, Word, Excel, CSV or an image. Up to 8MB each.
          </p>

          <ActionForm
            action={uploadDocumentAction}
            className="mt-5 grid gap-4"
            resetOnSuccess
            successLabel="Uploaded"
          >
            <input
              type="file"
              name="file"
              required
              className="block w-full cursor-pointer rounded-lg border border-dashed border-line bg-surface-sunken p-4 text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-forest file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"
            />

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                What is it?
              </span>
              <select name="kind" defaultValue="price_list" className={field}>
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Call it{" "}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input
                name="name"
                placeholder="Leave blank to use the file name"
                className={field}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-strong">
                Anything worth remembering{" "}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <textarea
                name="notes"
                rows={2}
                placeholder="Valid until March, superseded by the 2026 list…"
                className={`${field} resize-y`}
              />
            </label>

            <SubmitButton pendingLabel="Uploading" className="justify-self-start">
              Upload
            </SubmitButton>
          </ActionForm>
        </Card>

        <div>
          {rows.length === 0 ? (
            <Empty
              title="Nothing uploaded yet"
              body="Start with the current price list and any certification. Those two answer most of what anyone asks about the range."
            />
          ) : (
            <ul className="grid gap-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-raised p-4"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/admin/documents/${row.id}`}
                      className="font-medium text-strong underline-offset-4 hover:text-accent-quiet hover:underline"
                    >
                      {row.name}
                    </a>
                    <p className="mt-0.5 text-xs text-muted">
                      {readableSize(row.sizeBytes)} ·{" "}
                      {new Date(row.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {row.notes && (
                      <p className="mt-1 text-xs text-muted">{row.notes}</p>
                    )}
                  </div>

                  <Pill>{KIND_LABEL[row.kind] ?? row.kind}</Pill>

                  <ActionForm action={deleteDocumentAction}>
                    <input type="hidden" name="documentId" value={row.id} />
                    <SubmitButton variant="danger" pendingLabel="Deleting">
                      Delete
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
