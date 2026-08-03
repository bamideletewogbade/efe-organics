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
 * NOT HANDLED, DELIBERATELY: encodings other than UTF-8, and semicolon
 * delimiters. Both are worth adding the day an export actually arrives that
 * needs them, and guessing at them now would be untested code.
 */

export type CsvTable = {
  headers: string[];
  rows: string[][];
  /** Rows whose column count did not match the header. Usually a malformed file. */
  ragged: number;
};

/** Strips a UTF-8 byte order mark, which Excel writes and which breaks the first header. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(input: string): CsvTable {
  const text = stripBom(input);
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
    if (char === ",") {
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

  return { headers, rows: normalised, ragged };
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
