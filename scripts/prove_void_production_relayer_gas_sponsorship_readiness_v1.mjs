#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1,
  classifyProductionRelayerGasSponsorshipReadinessV1,
} from "../tools/void-production-relayer-gas-sponsorship-readiness-v1.mjs";

const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/production-relayer-gas-sponsorship-candidate-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1,
  "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1",
);

const held = classifyProductionRelayerGasSponsorshipReadinessV1(candidate);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "production_gates_incomplete");
assert.deepEqual(held.missing_gates, [
  "initial_fee_asset_selection_required",
  "market_quote_source_selection_required",
  "explicit_service_fee_bps_required",
  "market_quote_adapter_required",
  "participant_ui_relayer_toggle_required",
  "participant_ui_itemized_quote_required",
  "runtime_user_native_balance_gate_required",
  "fee_asset_reservation_collection_required",
  "post_execution_receipt_binding_required",
  "fee_asset_refund_required",
  "relayer_reserve_accounting_required",
  "native_gas_reserve_replenishment_required",
  "duplicate_replay_protection_required",
  "bounded_canary_required",
  "public_activation_ready_required",
]);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (key === "source_classification_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

function clone() {
  return JSON.parse(JSON.stringify(candidate));
}

for (const [label, mutate, reason] of [
  [
    "fixed conversion restored",
    (v) => {
      v.policy.fixed_conversion = true;
    },
    "production_relayer_policy_invariant_mismatch",
  ],
  [
    "relayer defaulted on",
    (v) => {
      v.policy.explicit_relayer_opt_in_required = false;
    },
    "production_relayer_policy_invariant_mismatch",
  ],
  [
    "relayer allowed despite user gas",
    (v) => {
      v.policy.relayer_only_when_user_gas_insufficient = false;
    },
    "production_relayer_policy_invariant_mismatch",
  ],
  [
    "service fee hidden",
    (v) => {
      v.policy.service_fee_separately_itemized = false;
    },
    "production_relayer_policy_invariant_mismatch",
  ],
  [
    "unused gas not refunded",
    (v) => {
      v.policy.unused_gas_refund_required = false;
    },
    "production_relayer_policy_invariant_mismatch",
  ],
  [
    "automatic conversion silently enabled",
    (v) => {
      v.policy.automatic_fee_asset_to_native_conversion = true;
    },
    "production_relayer_policy_invariant_mismatch",
  ],
  [
    "funds authority enabled",
    (v) => {
      v.authority.funds_movement = true;
    },
    "authority_must_remain_false",
  ],
]) {
  const value = clone();
  mutate(value);
  const decision =
    classifyProductionRelayerGasSponsorshipReadinessV1(value);
  assert.equal(decision.ok, false, label);
  assert.equal(decision.reason, reason, label);
}

{
  const value = clone();
  value.service_fee_bps = "0";
  const decision =
    classifyProductionRelayerGasSponsorshipReadinessV1(value);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "service_fee_bps_invalid");
}

{
  const value = clone();
  Object.assign(value, {
    status: "source_ready",
    initial_fee_asset_id: "WC",
    market_quote_source_id: "wc-void-market-v1",
    service_fee_bps: "500",
    market_quote_adapter_implemented: true,
    participant_ui_relayer_toggle_implemented: true,
    participant_ui_itemized_quote_implemented: true,
    runtime_user_native_balance_gate_implemented: true,
    fee_asset_reservation_collection_implemented: true,
    post_execution_receipt_binding_implemented: true,
    fee_asset_refund_implemented: true,
    relayer_reserve_accounting_implemented: true,
    native_gas_reserve_replenishment_implemented: true,
    duplicate_replay_protection_proven: true,
    bounded_canary_green: true,
    public_activation_ready: true,
  });

  const ready =
    classifyProductionRelayerGasSponsorshipReadinessV1(value);
  assert.equal(ready.ok, true);
  assert.equal(ready.status, "SOURCE_READY");
  assert.equal(ready.initial_fee_asset_id, "WC");
  assert.equal(ready.market_quote_source_id, "wc-void-market-v1");
  assert.equal(ready.service_fee_bps, "500");
  assert.equal(ready.user_pays_first, true);
  assert.equal(ready.explicit_relayer_opt_in_required, true);
  assert.equal(ready.relayer_only_when_user_gas_insufficient, true);
  assert.equal(ready.service_fee_is_privilege_fee, true);
  assert.equal(ready.actual_gas_reconciliation_required, true);
  assert.equal(ready.unused_gas_refund_required, true);
  assert.equal(ready.reserve_accounting_required, true);
  assert.equal(ready.activation_authorized, false);
  assert.equal(ready.funds_movement_authorized, false);
}

const source = fs.readFileSync(
  "tools/void-production-relayer-gas-sponsorship-readiness-v1.mjs",
  "utf8",
);
assert.equal(source.includes("100 WC = 1 VOID"), false);

console.log(
  "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1_PROOF_GREEN",
);
console.log("candidate_status=HOLD");
console.log("user_pays_first=true");
console.log("explicit_relayer_opt_in_required=true");
console.log("relayer_only_when_user_gas_insufficient=true");
console.log("market_quote_required=true");
console.log("fixed_conversion=false");
console.log("service_fee_is_privilege_fee=true");
console.log("service_fee_bps_selected=false");
console.log("initial_fee_asset_selected=false");
console.log("market_quote_adapter_implemented=false");
console.log("participant_ui_relayer_toggle_implemented=false");
console.log("runtime_integration_implemented=false");
console.log("native_gas_reserve_replenishment_implemented=false");
console.log("public_activation_ready=false");
console.log("funds_movement=false");
