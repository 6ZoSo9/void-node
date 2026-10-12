#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_RESULT_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-result-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-result-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_RESULT_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_result_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_closeout_hold" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-result-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_RESULT_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_result_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_write_apply_result_hold_states), "allowed states missing");
assert(fixture.allowed_write_apply_result_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_closeout_hold"), "next closeout state missing");
assert(fixture.write_apply_result_hold_state === "held_result_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const result = fixture.proposed_write_apply_result;
assert(result.result_hold_created === false, "fixture must not create result hold");
assert(result.result_hold_completed === false, "fixture result hold must not complete");
assert(result.result_authorized === false, "fixture result must not authorize");
assert(result.execution_apply_ready === false, "fixture execution apply ready must be false");
assert(result.execution_apply_performed === false, "fixture execution apply performed must be false");
assert(result.final_apply_preflight_passed === false, "fixture final preflight passed must be false");
assert(result.operator_apply_intent_authorized === false, "fixture operator intent authorized must be false");
assert(result.activation_gate_opened === false, "fixture activation gate opened must be false");
assert(result.authority_activation_record_ready === false, "fixture authority record ready must be false");
assert(result.authority_activated === false, "fixture authority activated must be false");
assert(result.write_apply_execution_ready === false, "fixture write apply execution ready must be false");
assert(result.write_apply_packet_verified === false, "fixture write apply packet verified must be false");
assert(result.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(result.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(result.manual_fulfillment_record_write_performed === false, "fixture record write performed must be false");
assert(result.manual_fulfillment_record_apply_performed === false, "fixture record apply performed must be false");
assert(result.append_only_ledger_write_performed === false, "fixture append-only ledger write must be false");
assert(result.allocation_claim_created === false, "fixture allocation claim created must be false");
assert(result.void_transfer_performed === false, "fixture VOID transfer must be false");
assert(result.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(result.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(result.result_key === "fixture_shape_only_no_result_written", "bad result key");
assert(result.result_status === "not_applied_fixture_shape_only", "bad result status");
assert(result.result_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(result.result_reason_codes.includes("execution_apply_not_performed"), "execution apply not performed reason missing");
assert(result.result_reason_codes.includes("execution_apply_authority_false"), "execution apply authority false reason missing");
assert(result.result_reason_codes.includes("result_authority_false"), "result authority false reason missing");
assert(result.result_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(result.result_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(result.result_reason_codes.includes("no_result_applied"), "no result applied reason missing");
assert(result.blocked_reason_codes.includes("blocked_result_authority_false"), "blocked result authority false missing");
assert(result.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_closeout_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_result_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_result_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-result-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_result_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_result_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_result_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_result_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_result_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_RESULT_HOLD_V1_GREEN"
