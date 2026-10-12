#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_DUPLICATE_KEY_GUARD_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-duplicate-key-guard-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-duplicate-key-guard-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_DUPLICATE_KEY_GUARD_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_duplicate_record_key_guard_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_packet_hold" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-duplicate-key-guard-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_DUPLICATE_KEY_GUARD_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_duplicate_record_key_guard_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_duplicate_key_guard_hold_states), "allowed states missing");
assert(fixture.allowed_duplicate_key_guard_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_packet_hold"), "next apply packet hold state missing");
assert(fixture.duplicate_key_guard_hold_state === "held_duplicate_record_key_guard_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const guard = fixture.proposed_duplicate_key_guard;
assert(guard.guard_required === true, "guard must be required");
assert(guard.guard_executed === false, "fixture must not execute duplicate guard");
assert(guard.guard_passed === false, "fixture guard must not pass");
assert(guard.duplicate_record_key_detected === false, "fixture duplicate detected must be false");
assert(guard.append_only_target_present === false, "fixture append-only target must be false");
assert(guard.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(guard.lookup_scope === "fixture_shape_only_no_real_lookup", "bad lookup scope");
assert(guard.guard_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(guard.guard_reason_codes.includes("no_real_duplicate_lookup"), "no real duplicate lookup reason missing");
assert(guard.guard_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(guard.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_packet_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-duplicate-key-guard-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_duplicate_key_guard_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_DUPLICATE_KEY_GUARD_HOLD_V1_GREEN"
