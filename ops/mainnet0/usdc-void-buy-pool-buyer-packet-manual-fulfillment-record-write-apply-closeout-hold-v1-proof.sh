#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSEOUT_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closeout-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closeout-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSEOUT_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_closeout_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_terminal_summary_hold" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closeout-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSEOUT_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_closeout_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_write_apply_closeout_hold_states), "allowed states missing");
assert(fixture.allowed_write_apply_closeout_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_terminal_summary_hold"), "next terminal summary state missing");
assert(fixture.write_apply_closeout_hold_state === "held_closeout_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const closeout = fixture.proposed_write_apply_closeout;
assert(closeout.closeout_hold_created === false, "fixture must not create closeout hold");
assert(closeout.closeout_hold_completed === false, "fixture closeout hold must not complete");
assert(closeout.closeout_authorized === false, "fixture closeout must not authorize");
assert(closeout.closeout_applied === false, "fixture closeout must not apply");
assert(closeout.result_hold_ready === false, "fixture result hold ready must be false");
assert(closeout.result_applied === false, "fixture result applied must be false");
assert(closeout.execution_apply_ready === false, "fixture execution apply ready must be false");
assert(closeout.execution_apply_performed === false, "fixture execution apply performed must be false");
assert(closeout.final_apply_preflight_passed === false, "fixture final preflight passed must be false");
assert(closeout.operator_apply_intent_authorized === false, "fixture operator intent authorized must be false");
assert(closeout.activation_gate_opened === false, "fixture activation gate opened must be false");
assert(closeout.authority_activation_record_ready === false, "fixture authority record ready must be false");
assert(closeout.authority_activated === false, "fixture authority activated must be false");
assert(closeout.write_apply_execution_ready === false, "fixture write apply execution ready must be false");
assert(closeout.write_apply_packet_verified === false, "fixture write apply packet verified must be false");
assert(closeout.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(closeout.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(closeout.manual_fulfillment_record_write_performed === false, "fixture record write performed must be false");
assert(closeout.manual_fulfillment_record_apply_performed === false, "fixture record apply performed must be false");
assert(closeout.append_only_ledger_write_performed === false, "fixture append-only ledger write must be false");
assert(closeout.allocation_claim_created === false, "fixture allocation claim created must be false");
assert(closeout.void_transfer_performed === false, "fixture VOID transfer must be false");
assert(closeout.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(closeout.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(closeout.closeout_key === "fixture_shape_only_no_closeout_written", "bad closeout key");
assert(closeout.closeout_status === "not_closed_fixture_shape_only", "bad closeout status");
assert(closeout.terminal_summary_status === "not_ready_fixture_shape_only", "bad terminal summary status");
assert(closeout.closeout_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(closeout.closeout_reason_codes.includes("result_not_applied"), "result not applied reason missing");
assert(closeout.closeout_reason_codes.includes("closeout_authority_false"), "closeout authority false reason missing");
assert(closeout.closeout_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(closeout.closeout_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(closeout.closeout_reason_codes.includes("no_result_applied"), "no result applied reason missing");
assert(closeout.closeout_reason_codes.includes("no_closeout_applied"), "no closeout applied reason missing");
assert(closeout.blocked_reason_codes.includes("blocked_closeout_authority_false"), "blocked closeout authority false missing");
assert(closeout.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_terminal_summary_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-closeout-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_closeout_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_CLOSEOUT_HOLD_V1_GREEN"
