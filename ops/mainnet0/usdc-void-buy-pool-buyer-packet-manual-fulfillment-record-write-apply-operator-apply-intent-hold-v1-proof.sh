#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_OPERATOR_APPLY_INTENT_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-operator-apply-intent-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-operator-apply-intent-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_OPERATOR_APPLY_INTENT_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_operator_apply_intent_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_final_apply_preflight_hold" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-operator-apply-intent-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_OPERATOR_APPLY_INTENT_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_operator_apply_intent_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_operator_apply_intent_hold_states), "allowed states missing");
assert(fixture.allowed_operator_apply_intent_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_final_apply_preflight_hold"), "next final apply preflight state missing");
assert(fixture.operator_apply_intent_hold_state === "held_operator_apply_intent_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const intent = fixture.proposed_operator_apply_intent;
assert(intent.operator_apply_intent_created === false, "fixture must not create operator apply intent");
assert(intent.operator_apply_intent_completed === false, "fixture intent must not complete");
assert(intent.operator_apply_intent_approved === false, "fixture must not approve operator apply intent");
assert(intent.operator_apply_intent_authorized === false, "fixture must not authorize operator apply intent");
assert(intent.activation_gate_ready === false, "fixture activation gate ready must be false");
assert(intent.activation_gate_opened === false, "fixture activation gate opened must be false");
assert(intent.authority_activation_record_ready === false, "fixture authority activation record ready must be false");
assert(intent.authority_activated === false, "fixture authority activated must be false");
assert(intent.write_apply_execution_ready === false, "fixture execution ready must be false");
assert(intent.write_apply_packet_verified === false, "fixture apply packet verified must be false");
assert(intent.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(intent.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(intent.operator_final_approval_present === false, "fixture final approval must be false");
assert(intent.record_write_apply_authorized === false, "fixture record write apply authorized must be false");
assert(intent.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(intent.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(intent.operator_apply_intent_key === "fixture_shape_only_no_operator_apply_intent_written", "bad operator apply intent key");
assert(intent.intent_status === "not_authorized_fixture_shape_only", "bad intent status");
assert(intent.intent_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(intent.intent_reason_codes.includes("activation_gate_not_opened"), "activation gate not opened reason missing");
assert(intent.intent_reason_codes.includes("operator_apply_intent_authority_false"), "operator apply intent authority false reason missing");
assert(intent.intent_reason_codes.includes("operator_apply_intent_not_authorized"), "operator apply intent not authorized reason missing");
assert(intent.intent_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(intent.intent_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(intent.blocked_reason_codes.includes("blocked_operator_apply_intent_authority_false"), "blocked operator apply intent authority false missing");
assert(intent.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_final_apply_preflight_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-operator-apply-intent-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_operator_apply_intent_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_OPERATOR_APPLY_INTENT_HOLD_V1_GREEN"
