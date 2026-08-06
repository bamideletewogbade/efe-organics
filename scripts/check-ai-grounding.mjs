/**
 * Shows exactly what the assistant is allowed to know.
 *
 *   npx tsx --env-file=.env.local scripts/check-ai-grounding.mjs
 *
 * The guardrails in the system prompt are only as good as the facts they sit
 * next to. If a price is missing from the fact block the model cannot quote it,
 * and if a wrong one is in there the model will quote it confidently. So the
 * block is printed and read, rather than assumed correct because the code that
 * builds it compiles.
 *
 * This needs no API key. It calls nothing.
 */
import {
  catalogueFacts,
  productFacts,
  stockFacts,
  voiceFacts,
} from "../src/lib/ai/grounding.ts";

const line = (title) => console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`);

line("ONE PRODUCT (what the copywriter sees)");
const product = await productFacts("green-herbal-hair-scalp-oil-120ml");
console.log(product ?? "NOT FOUND");

line("CATALOGUE (what 'ask the shop' sees)");
const catalogue = await catalogueFacts();
console.log(catalogue.slice(0, 1400));
console.log(`\n... ${catalogue.length} characters total`);

line("STOCK");
const stock = await stockFacts();
console.log(stock.slice(0, 700));

line("VOICE");
console.log((await voiceFacts()).slice(0, 500));

/* ---- checks that matter ---- */
line("CHECKS");

const checks = [
  {
    name: "product facts name the ingredient list or admit it is missing",
    pass:
      product &&
      (/Ingredients as listed/.test(product) || /NOT RECORDED/.test(product)),
  },
  {
    name: "catalogue carries real prices, not placeholders",
    pass: /GH₵\d/.test(catalogue),
  },
  {
    name: "stock states its own reliability",
    pass: /not being tracked|available|out of stock|not available/.test(stock),
  },
  {
    name: "nothing tells the model a delivery price or time",
    pass: !/delivery (is|costs) GH₵/i.test(catalogue),
  },
  {
    name: "no unlabelled health claim reaches the model",
    /*
      An earlier version of this check only looked for "cures", "treats" and
      "clinically", and passed while the scalp oil's fact block cheerfully
      handed the model "Stimulates scalp and promotes hair growth" as a fact.
      The verb list is wider now, and a claim is only acceptable when it is
      explicitly quoted as unverified prior copy.
    */
    pass: (() => {
      const text = `${product}\n${catalogue}`;
      const claim =
        /(stimulat|promot|treats?|cures?|heals?|repairs?|restores?|prevents?|clinical|dermatolog)/i;
      if (!claim.test(text)) return true;
      // Acceptable only inside the quoted, explicitly unverified block.
      return /UNVERIFIED/.test(text) && /Do not repeat any effect/.test(text);
    })(),
  },
  {
    name: "prior copy is labelled unverified rather than presented as approved",
    pass: !product?.includes("Existing description:"),
  },
];

let failed = 0;
for (const check of checks) {
  if (!check.pass) failed++;
  console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.name}`);
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
