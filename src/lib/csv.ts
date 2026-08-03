/**
 * CSV parsing, to RFC 4180.
 *
 * WHY NOT `text.split(",")`
 *
 * The first real export will break it. A delivery address contains commas, a
 * product description contains a quoted comma, and a customer note contains a
 * line break inside a quoted field. All three are legal CSV and all three turn
 * a naive split into silently misaligned columns, which is the worst kind of
 * import bug because it succeeds.
 *
 * WHY NOT A LIBRARY
 *
 * A correct parser is about sixty lines. Adding a dependency to the bundle for
 * that, when the project has kept its dependency list to five, is a bad trade.
 *
 * DELIMITERS ARE DETECTED, NOT ASSUMED.
 *
 * This used to assume a comma and say so. Then the Ecwid export dialog turned
 * out to offer semicolon, comma AND tab, with the choice remembered per store,
 * so whichever one Alberta happened to pick is the one we get. A semicolon file
 * parsed as comma-delimited yields exactly one enormous column per row: no
 * error, no crash, just an import screen that says it found one field and looks
 * like our bug rather than a settings mismatch.
 *
 * Semicolon files are also what Excel writes in any locale that uses a comma as
 * the decimal separator, which is most of Europe, so this is not an Ecwid
 * quirk so much as the normal state of spreadsheets in the wild.
 *
 * NOT HANDLED, DELIBERATELY: encodings other than UTF-8. Worth adding the day an
 * export actually arrives that needs it; guessing now would be untested code.
 */

export type Delimiter = "," | ";" | "\t" | "|";

export type CsvTable = {
  headers: string[];
  rows: string[][];
  /** Rows whose column count did not match the header. Usually a malformed file. */
  ragged: number;
  /** Which delimiter was used, so the UI can say what it decided. */
  delimiter: Delimiter;
};

/**
 * Works out the delimiter from the header line.
 *
 * Counts candidates OUTSIDE quoted sections only. A header like
 * `"Name, first",Email` contains two commas but is two columns, and counting
 * naively would pick comma for the wrong reason or reject it for the wrong one.
 *
 * The header is enough: it is one line, it is always present, and unlike the
 * body it cannot contain a free-text address full of stray semicolons.
 */
export function detectDelimiter(input: string): Delimiter {
  const text = stripBom(input);
  const end = text.search(/\r?\n/);
  const header = end === -1 ? text : text.slice(0, end);

  const counts: Record<Delimiter, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  let quoted = false;

  for (let i = 0; i < header.length; i++) {
    const char = header[i];
    if (char === '"') {
      if (quoted && header[i + 1] === '"') {
        i++;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (char in counts) counts[char as Delimiter]++;
  }

  // Comma wins ties: it is the most common and the safest default for a
  // single-column file where every count is zero.
  const ranked = (Object.keys(counts) as Delimiter[]).sort(
    (a, b) => counts[b] - counts[a] || (a === "," ? -1 : 1),
  );
  return counts[ranked[0]] > 0 ? ranked[0] : ",";
}

/** Strips a UTF-8 byte order mark, which Excel writes and which breaks the first header. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(input: string, forced?: Delimiter): CsvTable {
  const text = stripBom(input);
  const delimiter = forced ?? detectDelimiter(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // A trailing newline should not produce a final empty row.
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      quoted = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      endField();
      i++;
      continue;
    }
    if (char === "\r") {
      // Swallow CR so CRLF files do not leave \r on every last field.
      i++;
      continue;
    }
    if (char === "\n") {
      endRow();
      i++;
      continue;
    }

    field += char;
    i++;
  }

  if (field !== "" || row.length > 0) endRow();

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  const width = headers.length;
  let ragged = 0;

  const normalised = rows.map((r) => {
    if (r.length !== width) ragged++;
    // Pad or trim so every row can be indexed by header position safely.
    const out = r.slice(0, width);
    while (out.length < width) out.push("");
    return out.map((cell) => cell.trim());
  });

  return { headers, rows: normalised, ragged, delimiter };
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Escapes one value for CSV output.
 *
 * A field is quoted when it contains the delimiter, a quote or a newline, and
 * embedded quotes are doubled. That is the whole of RFC 4180's writing rules and
 * skipping any of it produces files that break on re-import, which matters here
 * because the point of an export is that somebody can read it back.
 *
 * Leading `=`, `+`, `-` and `@` are prefixed with a single quote. Excel treats
 * those as the start of a formula, so a product literally named `=SUM(A1:A9)`,
 * or more realistically a note pasted from somewhere, becomes executable content
 * in the recipient's spreadsheet. This is CSV injection and it is the one
 * genuine security concern in generating a download.
 */
function escapeCell(value: unknown, delimiter: Delimiter): string {
  if (value === null || value === undefined) return "";

  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  const needsQuotes =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r");

  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds a CSV file from rows of objects.
 *
 * Written with a BOM and CRLF line endings. Both are concessions to Excel, which
 * is what the file will actually be opened in: without the BOM it mangles the
 * cedi sign and any accented name, and without CRLF some versions run the whole
 * file onto one line.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>,
  delimiter: Delimiter = ",",
): string {
  const lines = [
    columns.map((column) => escapeCell(column.header, delimiter)).join(delimiter),
    ...rows.map((row) =>
      columns
        .map((column) => escapeCell(row[column.key], delimiter))
        .join(delimiter),
    ),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/* -------------------------------------------------------------------------- */
/* Value coercion                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Reads a money value into minor units.
 *
 * Handles the shapes a real export actually contains: "GH₵1,250.00", "1250",
 * "1,250.00", "₵1250.5". Returns null rather than 0 when it cannot tell, so a
 * bad column becomes a skipped row with a reason instead of a free order.
 *
 * Rounds rather than truncates. `Math.trunc(12.99 * 100)` is 1298 in floating
 * point, which quietly loses a pesewa on a meaningful share of rows.
 */
export function toMinorUnits(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function toInteger(value: string): number | null {
  const cleaned = value.replace(/[^0-9-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads a date, preferring day-first.
 *
 * `03/04/2026` is 3 April in Ghana and 4 March to `new Date()`. Getting this
 * wrong shifts a year of sales history by up to eleven months and nothing about
 * the result looks broken, so day-first is applied explicitly for ambiguous
 * slash and dot formats. ISO dates are passed straight through, since those are
 * unambiguous and are what most exports actually use.
 */
export function toDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  // ISO first: 2026-04-03, optionally with a time.
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Day-first: 03/04/2026, 3-4-26, 03.04.2026, with optional time.
  const match = text.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (match) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = match;
    const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    const parsed = new Date(
      Date.UTC(year, Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
