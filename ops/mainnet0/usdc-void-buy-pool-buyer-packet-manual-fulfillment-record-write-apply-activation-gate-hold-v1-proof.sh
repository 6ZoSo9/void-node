#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_ACTIVATION_GATE_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-activation-gate-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-activation-gate-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_ACTIVATION_GATE_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_activation_gate_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_operator_apply_intent_hold" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-activation-gate-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_ACTIVATION_GATE_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_activation_gate_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_activation_gate_hold_states), "allowed states missing");
assert(fixture.allowed_activation_gate_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_operator_apply_intent_hold"), "next operator apply intent state missing");
assert(fixture.activation_gate_hold_state === "held_activation_gate_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const gate = fixture.proposed_activation_gate;
assert(gate.activation_gate_created === false, "fixture must not create activation gate");
assert(gate.activation_gate_completed === false, "fixture gate must not complete");
assert(gate.activation_gate_opened === false, "fixture must not open activation gate");
assert(gate.activation_gate_open_approved === false, "fixture must not approve gate open");
assert(gate.authority_activation_record_ready === false, "fixture authority activation record ready must be false");
assert(gate.authority_activation_decision_ready === false, "fixture authority activation decision ready must be false");
assert(gate.authority_activation_review_ready === false, "fixture authority activation review ready must be false");
assert(gate.authority_activated === false, "fixture must not activate authority");
assert(gate.record_write_apply_authorized === false, "fixture must not authorize record write apply");
assert(gate.write_apply_execution_ready === false, "fixture execution ready must be false");
assert(gate.write_apply_packet_verified === false, "fixture apply packet verified must be false");
assert(gate.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(gate.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(gate.operator_final_approval_present === false, "fixture final approval must be false");
assert(gate.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(gate.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(gate.activation_gate_key === "fixture_shape_only_no_gate_opened", "bad activation gate key");
assert(gate.gate_status === "closed_fixture_shape_only", "bad gate status");
assert(gate.gate_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(gate.gate_reason_codes.includes("activation_gate_authority_false"), "activation gate authority false reason missing");
assert(gate.gate_reason_codes.includes("activation_gate_not_opened"), "activation gate not opened reason missing");
assert(gate.gate_reason_codes.includes("authority_activation_not_performed"), "authority activation not performed reason missing");
assert(gate.gate_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(gate.gate_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(gate.blocked_reason_codes.includes("blocked_activation_gate_authority_false"), "blocked activation gate authority false missing");
assert(gate.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_operator_apply_intent_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-activation-gate-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_activation_gate_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_ACTIVATION_GATE_HOLD_V1_GREEN"
