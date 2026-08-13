import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_PRESALE_EXIT_READINESS_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1,
  classifyBuyVoidPresaleExitReadinessV1,
} from "../tools/void-buy-void-presale-exit-readiness-v1.mjs";

const snapshot = (overrides = {}) => ({
  schema: "void_buy_void_inventory_aggregate_v1",
  marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
  pool_id: "void-presale-mainnet0-v1",
  inventory_policy_version: "void-presale-inventory-v1",
  pool_capacity_void_units: "10000000000000",
  committed_void_units: "2500000",
  available_void_units: "9999997500000",
  reservation_count: 1,
  sold_out: false,
  presale_open: true,
  intake_enabled: true,
  ...overrides,
});

const open = classifyBuyVoidPresaleExitReadinessV1(snapshot());
assert.equal(open.marker, VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1);
assert.equal(open.ok, true);
assert.equal(open.status, "OPEN");
assert.equal(open.accept_new_requests, true);

const soldOut = classifyBuyVoidPresaleExitReadinessV1(snapshot({
  committed_void_units: "10000000000000",
  available_void_units: "0",
  sold_out: true,
}));
assert.equal(soldOut.ok, true);
assert.equal(soldOut.status, "SOLD_OUT");
assert.equal(soldOut.accept_new_requests, false);

const closed = classifyBuyVoidPresaleExitReadinessV1(snapshot({
  presale_open: false,
  intake_enabled: false,
}));
assert.equal(closed.ok, true);
assert.equal(closed.status, "CLOSED");
assert.equal(closed.accept_new_requests, false);

const disabled = classifyBuyVoidPresaleExitReadinessV1(snapshot({
  intake_enabled: false,
}));
assert.equal(disabled.ok, true);
assert.equal(disabled.status, "HOLD");
assert.equal(disabled.accept_new_requests, false);

for (const invalid of [
  snapshot({ available_void_units: "9999997500001" }),
  snapshot({ sold_out: true }),
  snapshot({ committed_void_units: 2500000 }),
  { ...snapshot(), unknown_field: true },
]) {
  const held = classifyBuyVoidPresaleExitReadinessV1(invalid);
  assert.equal(held.ok, false);
  assert.equal(held.status, "HOLD");
  assert.equal(held.accept_new_requests, false);
}

for (const amountField of [
  "pool_capacity_void_units",
  "committed_void_units",
  "available_void_units",
]) {
  const held = classifyBuyVoidPresaleExitReadinessV1(
    snapshot({ [amountField]: "9".repeat(79) }),
  );
  assert.equal(held.ok, false);
  assert.equal(held.status, "HOLD");
  assert.equal(held.reason, "inventory_amount_invalid");
}

for (const invalid of [
  snapshot({ reservation_count: 0 }),
  snapshot({
    committed_void_units: "0",
    available_void_units: "10000000000000",
    reservation_count: 1,
  }),
]) {
  const held = classifyBuyVoidPresaleExitReadinessV1(invalid);
  assert.equal(held.ok, false);
  assert.equal(held.status, "HOLD");
  assert.equal(held.reason, "reservation_count_committed_mismatch");
}

assert.deepEqual(open.authority, VOID_BUY_VOID_PRESALE_EXIT_READINESS_AUTHORITY_V1);
assert.equal(Object.isFrozen(open), true);
assert.equal(Object.isFrozen(open.authority), true);
assert.equal(open.authority.request_intake_mutation, false);
assert.equal(open.authority.inventory_mutation, false);
assert.equal(open.authority.wallet_or_signer_access, false);
assert.equal(open.authority.transaction_broadcast, false);
assert.equal(open.authority.money_movement, false);
assert.equal(open.authority.market_activation, false);

console.log("VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1_GREEN");
console.log("open_inventory_accepts_requests=1");
console.log("sold_out_rejects_requests=1");
console.log("closed_policy_rejects_requests=1");
console.log("disabled_intake_holds=1");
console.log("accounting_drift_holds=1");
console.log("unknown_fields_hold=1");
console.log("oversized_amounts_hold=1");
console.log("reservation_count_mismatch_holds=1");
console.log("request_intake_mutation=0");
console.log("inventory_mutation=0");
console.log("wallet_or_signer_access=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
console.log("market_activation=0");
