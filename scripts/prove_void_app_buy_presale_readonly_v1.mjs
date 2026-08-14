import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const viewsPath = "public/void-app-wave1-v1/assets/js/views.js";
const source = readFileSync(viewsPath, "utf8");

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
for (const required of [
  "VOID_BUY_VOID_APP_READONLY_V1",
  "$0.50 / VOID",
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

assert.doesNotThrow(() => {
  new Function(source.replace("export const views =", "const views ="));
});

console.log("VOID_BUY_VOID_APP_READONLY_V1_GREEN");
console.log("fixed_price_policy_visible=1");
console.log("live_readiness_required=1");
console.log("payment_address_absent=1");
console.log("payment_not_fulfillment=1");
console.log("purchase_mutation=0");
console.log("inventory_mutation=0");
console.log("wallet_or_signer_access=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
