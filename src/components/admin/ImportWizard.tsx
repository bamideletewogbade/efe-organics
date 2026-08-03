"use client";

import { useState } from "react";

import { commitImportAction } from "@/app/admin/import-actions";
import { Card, Pill } from "@/components/admin/AdminUI";
import { ActionForm, SubmitButton } from "@/components/admin/Form";
import { parseCsv, type CsvTable } from "@/lib/csv";
import {
  detect,
  mapForEntity,
  SCHEMAS,
  type ImportEntity,
  type Mapping,
} from "@/lib/import-map";

/**
 * Bringing a spreadsheet in.
 *
 * THE SHAPE OF THIS SCREEN IS THE POINT.
 *
 * An import that says "choose a file" and then "done" is untrustworthy, and
 * people are right not to trust it: they are pushing a year of their own sales
 * history into a system they have used for ten minutes. So it is three visible
 * steps and the middle one shows the machine's guess rather than hiding it.
 *
 * Choose, check, commit. Nothing is written until the last button.
 *
 * ONE FORM, ONE FILE INPUT. The picker below is the form's own field. An
 * earlier version parsed in one input and copied the File into a second hidden
 * one for submission, which worked and was a lie waiting to happen: two inputs
 * that must always agree eventually do not.
 *
 * The browser's parse only draws the preview. The server parses the same file
 * again on submit, so nothing here decides what reaches the database.
 */
export function ImportWizard() {
  const [table, setTable] = useState<CsvTable | null>(null);
  const [entity, setEntity] = useState<ImportEntity>("orders");
  const [mapping, setMapping] = useState<Mapping>({});
  const [confidence, setConfidence] = useState(0);
  const [oversize, setOversize] = useState(false);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setTable(null);
      return;
    }

    setOversize(file.size > 12 * 1024 * 1024);
    const parsed = parseCsv(await file.text());
    const guess = detect(parsed.headers);

    setTable(parsed);
    setEntity(guess.entity);
    setMapping(guess.mapping);
    setConfidence(guess.confidence);
  }

  function changeEntity(next: ImportEntity) {
    setEntity(next);
    if (!table) return;
    const remapped = mapForEntity(table.headers, next);
    setMapping(remapped.mapping);
    setConfidence(remapped.confidence);
  }

  const spec = SCHEMAS[entity];
  const missing = spec.fields.filter(
    (f) => f.required && mapping[f.key] == null,
  );
  const mapped = spec.fields.filter((f) => mapping[f.key] != null);
  const ready = Boolean(table) && missing.length === 0 && !oversize;

  const field =
    "w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none";

  const matchedOn =
    entity === "orders"
      ? "the order number"
      : entity === "customers"
        ? "the email address"
        : "the SKU";

  return (
    <ActionForm
      action={commitImportAction}
      className="mt-6 grid gap-5"
      successLabel="Imported"
    >
      {/* ---- 1 ---- */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-semibold text-strong">1. Choose the file</h2>
          {table && (
            <Pill tone="good">
              {table.rows.length.toLocaleString()} rows found
            </Pill>
          )}
        </div>
        <p className="measure mt-1.5 text-sm/6 text-muted">
          An export from your current shop, or a spreadsheet you keep yourself.
          In Excel or Google Sheets choose <strong>Save as CSV</strong> first.
        </p>

        <input
          type="file"
          name="file"
          required
          accept=".csv,text/csv,text/plain"
          onChange={onFile}
          className="mt-4 block w-full cursor-pointer rounded-lg border border-dashed border-line bg-surface-sunken p-4 text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-forest file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"
        />

        {oversize && (
          <p className="mt-3 text-sm font-semibold text-[var(--blocked)]">
            That file is over 12MB. Export one year at a time, or split it.
          </p>
        )}
        {table && table.ragged > 0 && (
          <p className="mt-3 text-sm text-[var(--progress)]">
            {table.ragged} row{table.ragged === 1 ? "" : "s"} do not have the
            same number of columns as the header. Those will most likely be
            skipped, which usually means the file was edited by hand.
          </p>
        )}
      </Card>

      {table && (
        <>
          {/* ---- 2 ---- */}
          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-semibold text-strong">2. Check the columns</h2>
              <Pill
                tone={
                  confidence > 0.75 ? "good" : confidence > 0.4 ? "warn" : "bad"
                }
              >
                {confidence > 0.75
                  ? "Matched confidently"
                  : confidence > 0.4
                    ? "Partly matched"
                    : "Needs your help"}
              </Pill>
            </div>
            <p className="measure mt-1.5 text-sm/6 text-muted">
              This is our guess at what the file is and what each column means.
              Correct anything wrong. Nothing is saved yet.
            </p>

            <label className="mt-5 block max-w-sm">
              <span className="mb-1 block text-xs font-semibold text-strong">
                This file contains
              </span>
              <select
                value={entity}
                onChange={(e) => changeEntity(e.target.value as ImportEntity)}
                className={field}
              >
                {(Object.keys(SCHEMAS) as ImportEntity[]).map((key) => (
                  <option key={key} value={key}>
                    {SCHEMAS[key].label}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-xs/5 text-muted">
                {spec.blurb}
              </span>
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {spec.fields.map((f) => {
                const column = mapping[f.key];
                const unmet = f.required && column == null;
                return (
                  <label key={f.key} className="block">
                    <span className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-strong">
                      {f.label}
                      {f.required && (
                        <span className="font-normal text-[var(--blocked)]">
                          needed
                        </span>
                      )}
                    </span>
                    <select
                      value={column ?? ""}
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          [f.key]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className={`${field} ${unmet ? "border-[var(--blocked)]" : ""}`}
                    >
                      <option value="">Not in this file</option>
                      {table.headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                    {f.hint && (
                      <span className="mt-1 block text-[0.7rem]/4 text-muted">
                        {f.hint}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </Card>

          {/* ---- 3 ---- */}
          <Card>
            <h2 className="font-semibold text-strong">3. Check a few rows</h2>
            <p className="measure mt-1.5 text-sm/6 text-muted">
              The first five rows, read the way they are about to be saved. If a
              date or a price looks wrong here, it is wrong for every row.
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Preview of mapped rows</caption>
                <thead>
                  <tr className="border-b border-line bg-surface-sunken text-left">
                    {mapped.map((f) => (
                      <th
                        key={f.key}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-strong"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 5).map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-line last:border-b-0"
                    >
                      {mapped.map((f) => {
                        const value = row[mapping[f.key] as number];
                        return (
                          <td
                            key={f.key}
                            className="max-w-[16rem] truncate px-3 py-2 text-muted"
                          >
                            {value || (
                              <span className="text-muted/50">empty</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {missing.length > 0 && (
              <p className="mt-4 text-sm font-semibold text-[var(--blocked)]">
                Still need a column for:{" "}
                {missing.map((f) => f.label).join(", ")}
              </p>
            )}

            <input type="hidden" name="entity" value={entity} />
            <input
              type="hidden"
              name="mapping"
              value={JSON.stringify(mapping)}
            />

            <div className="mt-5">
              <SubmitButton pendingLabel="Importing" disabled={!ready}>
                Import {table.rows.length.toLocaleString()} rows
              </SubmitButton>
              <p className="mt-2 text-xs/5 text-muted">
                Safe to run twice. Rows are matched on {matchedOn}, so importing
                the same file again updates those rows rather than duplicating
                them.
              </p>
            </div>
          </Card>
        </>
      )}
    </ActionForm>
  );
}
