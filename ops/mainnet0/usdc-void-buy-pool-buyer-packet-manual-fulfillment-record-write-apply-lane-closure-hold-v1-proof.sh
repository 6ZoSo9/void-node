#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_CLOSURE_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-closure-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-closure-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_CLOSURE_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "manual_fulfillment_record_write_apply_lane_remains_closed_until_separate_authority_activation" "$doc"
grep -q "lane_closed_until_separate_authority_activation" "$doc"
grep -q "Authority remains false" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-closure-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_CLOSURE_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "manual_fulfillment_record_write_apply_lane_remains_closed_until_separate_authority_activation", "bad prior state");
assert(Array.isArray(fixture.allowed_lane_closure_hold_states), "allowed states missing");
assert(fixture.allowed_lane_closure_hold_states.includes("lane_closed_until_separate_authority_activation"), "lane closed state missing");
assert(fixture.lane_closure_hold_state === "lane_closed_until_separate_authority_activation", "bad lane closure hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const closure = fixture.lane_closure_summary;
assert(closure.lane_closure_created === false, "fixture must not create lane closure");
assert(closure.lane_closure_applied === false, "fixture must not apply lane closure");
assert(closure.lane_activation_authorized === false, "fixture lane activation must not authorize");
assert(closure.terminal_summary_applied === false, "terminal summary applied must be false");
assert(closure.closeout_applied === false, "closeout applied must be false");
assert(closure.result_applied === false, "result applied must be false");
assert(closure.execution_apply_performed === false, "execution apply performed must be false");
assert(closure.final_apply_preflight_passed === false, "final apply preflight passed must be false");
assert(closure.operator_apply_intent_authorized === false, "operator apply intent authorized must be false");
assert(closure.activation_gate_opened === false, "activation gate opened must be false");
assert(closure.authority_activated === false, "authority activated must be false");
assert(closure.manual_fulfillment_record_write_performed === false, "record write performed must be false");
assert(closure.manual_fulfillment_record_apply_performed === false, "record apply performed must be false");
assert(closure.append_only_ledger_write_performed === false, "append-only ledger write performed must be false");
assert(closure.allocation_claim_created === false, "allocation claim created must be false");
assert(closure.void_transfer_performed === false, "VOID transfer performed must be false");
assert(closure.lane_status === "closed_until_separate_authority_activation", "bad lane status");
assert(closure.closure_key === "fixture_shape_only_no_closure_written", "bad closure key");
assert(closure.closure_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(closure.closure_reason_codes.includes("authority_remains_false"), "authority remains false reason missing");
assert(closure.closure_reason_codes.includes("lane_activation_not_authorized"), "lane activation not authorized reason missing");
assert(closure.closure_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(closure.closure_reason_codes.includes("lane_closed_until_separate_authority_activation"), "lane closed reason missing");
assert(closure.blocked_reason_codes.includes("blocked_lane_closure_authority_false"), "blocked lane closure authority false missing");
assert(closure.terminal_operator_instruction === "do_not_apply_manual_fulfillment_record_write_apply_without_separate_authority_activation", "bad terminal instruction");

console.log("buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-lane-closure-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_lane_closure_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_LANE_CLOSURE_HOLD_V1_GREEN"
