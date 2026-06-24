#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_AUTHORITY_ACTIVATION_RECORD_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-authority-activation-record-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-authority-activation-record-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_AUTHORITY_ACTIVATION_RECORD_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_authority_activation_record_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_activation_gate_hold" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-authority-activation-record-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_AUTHORITY_ACTIVATION_RECORD_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_authority_activation_record_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_authority_activation_record_hold_states), "allowed states missing");
assert(fixture.allowed_authority_activation_record_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_activation_gate_hold"), "next activation gate state missing");
assert(fixture.authority_activation_record_hold_state === "held_authority_activation_record_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const record = fixture.proposed_authority_activation_record;
assert(record.activation_record_created === false, "fixture must not create activation record");
assert(record.activation_record_completed === false, "fixture activation record must not complete");
assert(record.authority_activation_decision_ready === false, "fixture decision ready must be false");
assert(record.authority_activation_approved === false, "fixture must not approve authority");
assert(record.authority_activated === false, "fixture must not activate authority");
assert(record.record_write_apply_authorized === false, "fixture must not authorize record write apply");
assert(record.activation_gate_opened === false, "fixture must not open activation gate");
assert(record.write_apply_execution_ready === false, "fixture execution ready must be false");
assert(record.write_apply_packet_verified === false, "fixture apply packet verified must be false");
assert(record.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(record.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(record.operator_final_approval_present === false, "fixture final approval must be false");
assert(record.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(record.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(record.activation_record_key === "fixture_shape_only_no_activation_record_written", "bad activation record key");
assert(record.record_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(record.record_reason_codes.includes("activation_record_authority_false"), "activation record authority false reason missing");
assert(record.record_reason_codes.includes("authority_activation_not_performed"), "authority activation not performed reason missing");
assert(record.record_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(record.record_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(record.blocked_reason_codes.includes("blocked_activation_record_authority_false"), "blocked activation record authority false missing");
assert(record.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_activation_gate_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-authority-activation-record-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_authority_activation_record_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_AUTHORITY_ACTIVATION_RECORD_HOLD_V1_GREEN"
