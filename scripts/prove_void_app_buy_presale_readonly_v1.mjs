import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewsPath = "public/void-app-wave1-v1/assets/js/views.js";
const canonicalPricePath = "src/index.ts";
const source = readFileSync(viewsPath, "utf8");
const canonicalSource = readFileSync(canonicalPricePath, "utf8");

function canonicalPriceDefaultPattern() {
  return /process\.env\.VOID_BUY_PRICE_USDC_PER_VOID\s*\|\|\s*"([0-9]+(?:\.[0-9]+)?)"/g;
}

function readCanonicalPrice(sourceText) {
  const defaults = [...sourceText.matchAll(canonicalPriceDefaultPattern())].map((match) => match[1]);
  assert.ok(defaults.length > 0, "canonical Buy VOID price default must be present in src/index.ts");
  const distinct = [...new Set(defaults)];
  assert.equal(distinct.length, 1, "all canonical Buy VOID price defaults in src/index.ts must agree exactly");
  return { price: distinct[0], occurrenceCount: defaults.length };
}

function incrementLeastSignificantDecimalUnit(value) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(value);
  assert.ok(match, `canonical Buy VOID price must be an exact non-negative decimal: ${value}`);
  const fraction = match[2] || "";
  const scale = fraction.length;
  const digits = `${match[1]}${fraction}`;
  const incremented = (BigInt(digits) + 1n).toString().padStart(scale + 1, "0");
  if (scale === 0) return incremented;
  return `${incremented.slice(0, -scale)}.${incremented.slice(-scale)}`;
}

function assertBuyPriceMatchesCanonical(buySource, canonicalSourceText) {
  const { price, occurrenceCount } = readCanonicalPrice(canonicalSourceText);
  const displayedDollarValues = [...buySource.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((match) => match[1]);
  assert.ok(displayedDollarValues.length > 0, "participant-visible Buy view must expose the reviewed policy price");
  for (const displayed of displayedDollarValues) {
    assert.equal(
      displayed,
      price,
      `participant-visible Buy price must match canonical VOID_BUY_PRICE_USDC_PER_VOID default (${price})`,
    );
  }
  return { price, occurrenceCount, displayCount: displayedDollarValues.length };
}

assert.match(source, /buy: \(\) => buyView\(\),/);
assert.doesNotMatch(
  source,
  /buy: \(\) => placeholderView/,
  "the Buy route must not fall back to the generic scaffold",
);

const start = source.indexOf("function buyView()");
const end = source.indexOf("function placeholderView", start);
assert.ok(start >= 0 && end > start, "bounded Buy view source block is required");

const buyView = source.slice(start, end);
const canonicalPrice = assertBuyPriceMatchesCanonical(buyView, canonicalSource);
for (const required of [
  "VOID_BUY_VOID_APP_READONLY_V1",
  `$${canonicalPrice.price} / VOID`,
  "HOLD — live readiness not loaded",
  "No payment address is published here.",
  "A payment observation is not a fulfillment receipt.",
  "OPEN, SOLD_OUT, CLOSED, or HOLD",
  "NOT ACTIVATED HERE",
  "No wallet, signer, transaction, inventory, or fulfillment action is available in this view.",
]) {
  assert.ok(buyView.includes(required), `missing fail-closed Buy view text: ${required}`);
}

for (const forbidden of [
  /fetch\s*\(/,
  /<form\b/i,
  /<input\b/i,
  /<button\b/i,
  /data-demo-toast/,
]) {
  assert.doesNotMatch(buyView, forbidden);
}

const driftedPrice = incrementLeastSignificantDecimalUnit(canonicalPrice.price);
let rewrittenDefaults = 0;
const driftedCanonicalSource = canonicalSource.replace(canonicalPriceDefaultPattern(), (full, captured) => {
  rewrittenDefaults += 1;
  return full.replace(`"${captured}"`, `"${driftedPrice}"`);
});
assert.equal(
  rewrittenDefaults,
  canonicalPrice.occurrenceCount,
  "falsification fixture must rewrite every canonical Buy VOID price default",
);
assert.throws(
  () => assertBuyPriceMatchesCanonical(buyView, driftedCanonicalSource),
  /participant-visible Buy price must match canonical/,
  "one least-significant-unit canonical policy change must fail the Buy-view price proof",
);

assert.doesNotThrow(() => {
  new Function(source.replace("export const views =", "const views ="));
});

console.log("VOID_BUY_VOID_APP_READONLY_V1_GREEN");
console.log(`canonical_price_usdc_per_void=${canonicalPrice.price}`);
console.log(`canonical_price_occurrences=${canonicalPrice.occurrenceCount}`);
console.log(`participant_price_occurrences=${canonicalPrice.displayCount}`);
console.log(`price_policy_one_unit_falsification=${driftedPrice}`);
console.log("price_policy_dependency_closed=1");
console.log("fixed_price_policy_visible=1");
console.log("live_readiness_required=1");
console.log("payment_address_absent=1");
console.log("payment_not_fulfillment=1");
console.log("purchase_mutation=0");
console.log("inventory_mutation=0");
console.log("wallet_or_signer_access=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
