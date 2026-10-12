#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_FINAL_ROLLUP_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-final-rollup-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-final-rollup-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_FINAL_ROLLUP_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "lane_closed_until_separate_authority_activation" "$doc"
grep -q "final_rollup_sealed_lane_closed_until_separate_authority_activation" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-final-rollup-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_FINAL_ROLLUP_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "lane_closed_until_separate_authority_activation", "bad prior state");
assert(Array.isArray(fixture.allowed_lane_final_rollup_hold_states), "allowed states missing");
assert(fixture.allowed_lane_final_rollup_hold_states.includes("final_rollup_sealed_lane_closed_until_separate_authority_activation"), "sealed final rollup state missing");
assert(fixture.lane_final_rollup_hold_state === "final_rollup_sealed_lane_closed_until_separate_authority_activation", "bad final rollup hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const rollup = fixture.lane_final_rollup_summary;
assert(rollup.final_rollup_created === false, "fixture must not create final rollup");
assert(rollup.final_rollup_applied === false, "fixture must not apply final rollup");
assert(rollup.lane_closure_applied === false, "lane closure applied must be false");
assert(rollup.lane_activation_authorized === false, "lane activation authorized must be false");
assert(rollup.terminal_summary_applied === false, "terminal summary applied must be false");
assert(rollup.closeout_applied === false, "closeout applied must be false");
assert(rollup.result_applied === false, "result applied must be false");
assert(rollup.execution_apply_performed === false, "execution apply performed must be false");
assert(rollup.final_apply_preflight_passed === false, "final apply preflight passed must be false");
assert(rollup.operator_apply_intent_authorized === false, "operator apply intent authorized must be false");
assert(rollup.activation_gate_opened === false, "activation gate opened must be false");
assert(rollup.authority_activated === false, "authority activated must be false");
assert(rollup.manual_fulfillment_record_write_performed === false, "record write performed must be false");
assert(rollup.manual_fulfillment_record_apply_performed === false, "record apply performed must be false");
assert(rollup.append_only_ledger_write_performed === false, "append-only ledger write performed must be false");
assert(rollup.allocation_claim_created === false, "allocation claim created must be false");
assert(rollup.void_transfer_performed === false, "VOID transfer performed must be false");
assert(rollup.lane_status === "closed_until_separate_authority_activation", "bad lane status");
assert(rollup.final_rollup_status === "sealed_shape_only_no_apply", "bad final rollup status");
assert(rollup.final_rollup_key === "fixture_shape_only_no_final_rollup_written", "bad final rollup key");
assert(rollup.final_authority_summary.all_write_authorities_false === true, "write authorities summary must be true");
assert(rollup.final_authority_summary.all_apply_authorities_false === true, "apply authorities summary must be true");
assert(rollup.final_authority_summary.all_transfer_authorities_false === true, "transfer authorities summary must be true");
assert(rollup.final_authority_summary.public_mutation_authority_false === true, "public mutation summary must be true");
assert(rollup.final_authority_summary.automatic_fulfillment_authority_false === true, "automatic fulfillment summary must be true");
assert(rollup.final_authority_summary.separate_authority_activation_required === true, "separate authority activation summary must be true");
assert(rollup.final_rollup_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(rollup.final_rollup_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(rollup.final_rollup_reason_codes.includes("lane_activation_not_authorized"), "lane activation not authorized reason missing");
assert(rollup.final_rollup_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(rollup.final_rollup_reason_codes.includes("lane_closed_until_separate_authority_activation"), "lane closed reason missing");
assert(rollup.final_rollup_reason_codes.includes("separate_authority_activation_required"), "separate authority activation reason missing");
assert(rollup.blocked_reason_codes.includes("blocked_final_rollup_authority_false"), "blocked final rollup authority false missing");
assert(rollup.final_lane_operator_instruction === "do_not_apply_manual_fulfillment_record_write_apply_without_separate_authority_activation", "bad final lane instruction");

console.log("buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-final-rollup-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_lane_final_rollup_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_FINAL_ROLLUP_HOLD_V1_GREEN"
