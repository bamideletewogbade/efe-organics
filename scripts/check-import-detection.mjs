/**
 * Tests header detection against real export shapes.
 *
 *   npx tsx scripts/check-import-detection.mjs
 *
 * Column mapping is the part of the importer that fails silently. A wrong guess
 * does not throw; it puts a town name in a money column and a year of sales
 * history lands slightly wrong in a way nobody notices for months. So the
 * mapping gets checked against headers taken from the systems Efe actually has
 * files from, rather than trusted because it looked sensible when written.
 *
 * The Ecwid rows use its REST field names and the human-readable equivalents its
 * export dialog produces. Shopify and WooCommerce are included because a
 * business that has migrated once tends to have files from more than one system.
 * The last case is the realistic one: a spreadsheet somebody kept by hand.
 */
import { detect, SCHEMAS } from "../src/lib/import-map.ts";
import { detectDelimiter, parseCsv } from "../src/lib/csv.ts";

const CASES = [
  {
    name: "Ecwid orders (export dialog headers)",
    expect: "orders",
    headers: [
      "Order Number", "Date Created", "Order Status", "Payment Status",
      "Customer Name", "Customer Email", "Customer Phone",
      "Shipping City", "Shipping State or Province", "Shipping Street",
      "Subtotal", "Shipping Cost", "Discount", "Order Total",
    ],
  },
  {
    name: "Ecwid orders (API spellings)",
    expect: "orders",
    headers: [
      "orderNumber", "createDate", "email", "paymentStatus",
      "subtotal", "total", "billingPerson", "shippingPerson",
    ],
  },
  {
    name: "Shopify orders",
    expect: "orders",
    headers: [
      "Name", "Email", "Created at", "Fulfillment Status", "Subtotal",
      "Shipping", "Total", "Discount Amount", "Shipping City",
      "Shipping Province", "Shipping Street", "Lineitem name",
    ],
  },
  {
    name: "Ecwid customers",
    expect: "customers",
    headers: ["Email", "Name", "Phone", "Accepts Marketing", "Notes"],
  },
  {
    name: "Ecwid products",
    expect: "products",
    headers: ["Product Name", "SKU", "Price", "Compare To Price", "Quantity", "Description"],
  },
  {
    name: "Hand-kept spreadsheet",
    expect: "orders",
    headers: ["Date", "Invoice", "Customer", "Phone", "Town", "Amount"],
  },
];

let failures = 0;

for (const testCase of CASES) {
  const result = detect(testCase.headers);
  const ok = result.entity === testCase.expect;
  if (!ok) failures++;

  const mapped = Object.entries(result.mapping).filter(([, v]) => v !== null);
  const required = SCHEMAS[result.entity].fields.filter((f) => f.required);
  const missing = required.filter((f) => result.mapping[f.key] === null);

  console.log(
    `${ok ? "PASS" : "FAIL"}  ${testCase.name.padEnd(38)} -> ${result.entity.padEnd(10)} conf ${result.confidence.toFixed(2)}  mapped ${mapped.length}/${testCase.headers.length}`,
  );
  if (!ok) console.log(`      expected ${testCase.expect}`);
  if (missing.length) {
    console.log(`      missing required: ${missing.map((f) => f.label).join(", ")}`);
  }

  // Show where each column landed, so a plausible-but-wrong mapping is visible
  // rather than hidden behind a passing entity guess.
  for (const [field, column] of mapped) {
    const spec = SCHEMAS[result.entity].fields.find((f) => f.key === field);
    console.log(`        ${String(testCase.headers[column]).padEnd(28)} -> ${spec?.label ?? field}`);
  }
}

/* ---- delimiters ---- */
console.log("\n-- delimiter detection --");
const DELIM_CASES = [
  ['a,b,c\n1,2,3', ","],
  ['a;b;c\n1;2;3', ";"],
  ['a\tb\tc\n1\t2\t3', "\t"],
  ['"Name, first";Email\n"Doe, Jane";j@x.com', ";"],
  ['single\n1', ","],
];
for (const [input, expected] of DELIM_CASES) {
  const got = detectDelimiter(input);
  const ok = got === expected;
  if (!ok) failures++;
  const show = (d) => (d === "\t" ? "tab" : d);
  console.log(`${ok ? "PASS" : "FAIL"}  ${JSON.stringify(input.slice(0, 26))} -> ${show(got)}`);
}

/* ---- the semicolon case that used to silently produce one column ---- */
const semi = parseCsv('Order Number;Total;Customer\n1001;15.00;Ama');
console.log(
  `\n${semi.headers.length === 3 ? "PASS" : "FAIL"}  semicolon file parses to ${semi.headers.length} columns (was 1 before detection)`,
);
if (semi.headers.length !== 3) failures++;

console.log(failures === 0 ? "\nall passed" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
