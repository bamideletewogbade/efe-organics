/**
 * Checks every model id and rate against OpenRouter's live list.
 *
 *   npx tsx scripts/check-ai-models.mjs
 *
 * Model ids churn: providers rename, deprecate and withdraw them, and a stale id
 * fails at runtime with a 400 that says very little. Worse, a stale FALLBACK id
 * fails silently, because the chain simply skips it and something further down
 * answers, so the shop keeps working while its resilience quietly rots.
 *
 * This needs no API key. The model list is public.
 */

import { CHAINS, RATES, TIER_CAPABILITY } from "../src/lib/ai/models.ts";

const response = await fetch("https://openrouter.ai/api/v1/models");
if (!response.ok) {
  console.error(`could not reach OpenRouter: ${response.status}`);
  process.exit(1);
}

const live = new Map(
  (await response.json()).data.map((model) => [model.id, model]),
);
console.log(`OpenRouter lists ${live.size} models\n`);

let problemCount = 0;

for (const [tier, chain] of Object.entries(CHAINS)) {
  const want = TIER_CAPABILITY[tier];
  console.log(`-- ${tier} --  accepts ${want.accepts.join("+")}, returns ${want.returns}`);
  const vendors = new Set();

  for (const [index, id] of chain.entries()) {
    const model = live.get(id);
    const position = index === 0 ? "primary " : `fallback${index}`;

    if (!model) {
      console.log(`  MISSING  ${position}  ${id}`);
      problemCount++;
      continue;
    }

    vendors.add(id.split("/")[0]);

    /*
      MODALITY IS CHECKED PER MODEL, NOT PER CHAIN.

      A chain is only as capable as its weakest member, because OpenRouter will
      fall through to it silently. A vision chain with one text-only model in
      position four is a vision chain that stops seeing images the first time
      the first three are busy, and answers anyway.
    */
    const accepts = model.architecture?.input_modalities ?? ["text"];
    const returns = model.architecture?.output_modalities ?? ["text"];
    const missingIn = want.accepts.filter((m) => !accepts.includes(m));
    const wrongOut = !returns.includes(want.returns);

    if (missingIn.length || wrongOut) {
      const problems = [
        missingIn.length ? `cannot accept ${missingIn.join("+")}` : null,
        wrongOut ? `does not return ${want.returns}` : null,
      ].filter(Boolean);
      console.log(`  MODALITY ${position}  ${id.padEnd(38)} <-- ${problems.join(", ")}`);
      problemCount++;
      continue;
    }

    const inPerM = Number(model.pricing.prompt) * 1_000_000;
    const outPerM = Number(model.pricing.completion) * 1_000_000;
    const rate = RATES[id];

    let note = "";
    if (!rate) {
      note = "  <-- no rate recorded, cost cannot be estimated";
      problemCount++;
    } else {
      // Rates drift. A small change is fine; a large one means the cost figures
      // shown in the admin are misleading.
      const drift = Math.max(
        Math.abs(inPerM - rate.inPerM) / Math.max(rate.inPerM, 0.001),
        Math.abs(outPerM - rate.outPerM) / Math.max(rate.outPerM, 0.001),
      );
      if (drift > 0.2) {
        note = `  <-- RATE DRIFT: recorded ${rate.inPerM}/${rate.outPerM}`;
        problemCount++;
      }
    }

    console.log(
      `  ok       ${position}  ${id.padEnd(38)} ${String(inPerM).padStart(6)}/${String(outPerM).padEnd(6)} ctx ${model.context_length}${note}`,
    );
  }

  /*
    A chain of one vendor is not a fallback chain. The likeliest failure is a
    provider outage, and every model from that provider goes down together.
  */
  if (vendors.size < 2) {
    console.log(`  WARNING: every model in this chain is from ${[...vendors][0]}`);
    problemCount++;
  } else {
    console.log(`  spans ${vendors.size} vendors: ${[...vendors].join(", ")}`);
  }
  console.log("");
}

console.log(problemCount === 0 ? "all good" : `${problemCount} problem(s) found`);
process.exit(problemCount === 0 ? 0 : 1);
