#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_EXECUTION_APPLY_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-execution-apply-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-execution-apply-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_EXECUTION_APPLY_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_execution_apply_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_result_hold" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-execution-apply-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_EXECUTION_APPLY_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_execution_apply_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_execution_apply_hold_states), "allowed states missing");
assert(fixture.allowed_execution_apply_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_result_hold"), "next result state missing");
assert(fixture.execution_apply_hold_state === "held_execution_apply_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const apply = fixture.proposed_execution_apply;
assert(apply.execution_apply_created === false, "fixture must not create execution apply");
assert(apply.execution_apply_completed === false, "fixture execution apply must not complete");
assert(apply.execution_apply_authorized === false, "fixture execution apply must not authorize");
assert(apply.execution_apply_performed === false, "fixture execution apply must not perform");
assert(apply.final_apply_preflight_ready === false, "fixture final preflight ready must be false");
assert(apply.final_apply_preflight_passed === false, "fixture final preflight passed must be false");
assert(apply.operator_apply_intent_ready === false, "fixture operator apply intent ready must be false");
assert(apply.operator_apply_intent_authorized === false, "fixture operator apply intent authorized must be false");
assert(apply.activation_gate_ready === false, "fixture activation gate ready must be false");
assert(apply.activation_gate_opened === false, "fixture activation gate opened must be false");
assert(apply.authority_activation_record_ready === false, "fixture authority activation record ready must be false");
assert(apply.authority_activated === false, "fixture authority activated must be false");
assert(apply.write_apply_execution_ready === false, "fixture write apply execution ready must be false");
assert(apply.write_apply_packet_verified === false, "fixture write apply packet verified must be false");
assert(apply.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(apply.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(apply.operator_final_approval_present === false, "fixture final approval must be false");
assert(apply.record_write_apply_authorized === false, "fixture record write apply authorized must be false");
assert(apply.record_write_performed === false, "fixture record write performed must be false");
assert(apply.record_apply_performed === false, "fixture record apply performed must be false");
assert(apply.append_only_ledger_write_performed === false, "fixture append-only ledger write must be false");
assert(apply.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(apply.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(apply.execution_apply_key === "fixture_shape_only_no_execution_apply_written", "bad execution apply key");
assert(apply.execution_apply_status === "not_performed_fixture_shape_only", "bad execution apply status");
assert(apply.execution_apply_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(apply.execution_apply_reason_codes.includes("final_apply_preflight_not_passed"), "final preflight not passed reason missing");
assert(apply.execution_apply_reason_codes.includes("operator_apply_intent_not_authorized"), "operator intent not authorized reason missing");
assert(apply.execution_apply_reason_codes.includes("activation_gate_not_opened"), "activation gate not opened reason missing");
assert(apply.execution_apply_reason_codes.includes("execution_apply_authority_false"), "execution apply authority false reason missing");
assert(apply.execution_apply_reason_codes.includes("execution_apply_not_performed"), "execution apply not performed reason missing");
assert(apply.execution_apply_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(apply.execution_apply_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(apply.blocked_reason_codes.includes("blocked_execution_apply_authority_false"), "blocked execution apply authority false missing");
assert(apply.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_result_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-execution-apply-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_execution_apply_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_EXECUTION_APPLY_HOLD_V1_GREEN"
