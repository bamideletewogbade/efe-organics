/**
 * Exercises the CSV parser and column detection against awkward input.
 *
 *   node --experimental-strip-types scripts/test-import.mjs
 *
 * These two modules decide where a year of somebody's sales history lands, and
 * both fail silently when they are wrong: a misparsed quote shifts every column
 * by one, a day-first date read as month-first moves the whole history by up to
 * eleven months, and neither throws. So they get checked directly rather than
 * by clicking through the admin.
 */

import { parseCsv, toDate, toMinorUnits } from "../src/lib/csv.ts";
import { detect } from "../src/lib/import-map.ts";

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    passed++;
    console.log(`  ok    ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}\n          got      ${a}\n          expected ${b}`);
  }
}

console.log("\nCSV parsing");

// The three things that break a naive split, all legal CSV.
const awkward = [
  'Order,Customer,Address,Total',
  '1001,"Mensah, Ama","5 Oxford St, Osu",120.50',
  '1002,Kwame,"Line one',
  'Line two",75',
  '1003,"He said ""yes""",Accra,60',
].join("\n");

const table = parseCsv(awkward);
check("header row", table.headers, ["Order", "Customer", "Address", "Total"]);
check("row count", table.rows.length, 3);
check("comma inside quotes", table.rows[0][1], "Mensah, Ama");
check("second quoted comma", table.rows[0][2], "5 Oxford St, Osu");
check("newline inside quotes", table.rows[1][2], "Line one\nLine two");
check("escaped double quote", table.rows[2][1], 'He said "yes"');
check("no ragged rows", table.ragged, 0);

// Excel writes a BOM and CRLF line endings.
const excelish = parseCsv('﻿Name,Qty\r\nSoap,3\r\n');
check("BOM stripped from first header", excelish.headers[0], "Name");
check("CRLF does not leave a carriage return", excelish.rows[0][1], "3");

// A trailing newline should not invent an empty row.
check("trailing newline ignored", parseCsv("A,B\n1,2\n").rows.length, 1);

console.log("\nMoney");
check("plain", toMinorUnits("120.50"), 12050);
check("with currency and separator", toMinorUnits("GH₵1,250.00"), 125000);
check("cedi sign", toMinorUnits("₵60"), 6000);
check("integer", toMinorUnits("75"), 7500);
check("rounds rather than truncates", toMinorUnits("12.99"), 1299);
check("empty is null, not zero", toMinorUnits(""), null);
check("nonsense is null, not zero", toMinorUnits("n/a"), null);

console.log("\nDates");
check(
  "ISO",
  toDate("2026-04-03")?.toISOString().slice(0, 10),
  "2026-04-03",
);
check(
  "slash format reads day first",
  toDate("03/04/2026")?.toISOString().slice(0, 10),
  "2026-04-03",
);
check(
  "unambiguous day still day first",
  toDate("25/12/2026")?.toISOString().slice(0, 10),
  "2026-12-25",
);
check(
  "two digit year",
  toDate("03-04-26")?.toISOString().slice(0, 10),
  "2026-04-03",
);
check("empty is null", toDate(""), null);

console.log("\nColumn detection");

const ecwidish = detect([
  "Order ID",
  "Date Placed",
  "Order Status",
  "Customer Name",
  "Email",
  "Phone",
  "Shipping City",
  "Order Total",
  "Shipping Cost",
]);
check("recognises an order export", ecwidish.entity, "orders");
check("finds the order number", ecwidish.mapping.legacyReference, 0);
check("finds the date", ecwidish.mapping.placedAt, 1);
check("finds the total", ecwidish.mapping.totalMinor, 7);
check("finds delivery", ecwidish.mapping.deliveryMinor, 8);
check("email not stolen by the name field", ecwidish.mapping.customerEmail, 4);
check("name maps to name", ecwidish.mapping.customerName, 3);
check("confident", ecwidish.confidence > 0.75, true);

const contacts = detect(["Full Name", "Email Address", "Mobile", "Subscribed"]);
check("recognises a customer list", contacts.entity, "customers");
check("finds email", contacts.mapping.email, 1);
check("finds consent", contacts.mapping.acceptsMarketing, 3);

const priceSheet = detect(["SKU", "Product Name", "Price", "Qty", "RRP"]);
check("recognises a price list", priceSheet.entity, "products");
check("finds sku", priceSheet.mapping.sku, 0);
check("finds price", priceSheet.mapping.priceMinor, 2);
check("finds stock", priceSheet.mapping.stockQty, 3);
check("finds was-price", priceSheet.mapping.compareAtMinor, 4);

const useless = detect(["colour", "notes", "misc"]);
check("low confidence on an unrecognisable file", useless.confidence < 0.4, true);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
