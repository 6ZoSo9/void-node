#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_PACKET_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-packet-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-packet-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_PACKET_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_packet_hold" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_execution_hold" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-packet-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_PACKET_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_packet_hold", "bad prior state");
assert(Array.isArray(fixture.allowed_write_apply_packet_hold_states), "allowed states missing");
assert(fixture.allowed_write_apply_packet_hold_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_execution_hold"), "next execution hold state missing");
assert(fixture.write_apply_packet_hold_state === "held_manual_fulfillment_record_write_apply_packet_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const packet = fixture.proposed_write_apply_packet;
assert(packet.packet_created === false, "fixture must not create packet");
assert(packet.packet_verified === false, "fixture must not verify packet");
assert(packet.packet_apply_authorized === false, "fixture must not authorize apply");
assert(packet.proposed_manual_fulfillment_record_key === "fixture_shape_only_not_written", "bad fixture record key");
assert(packet.proposed_record_body_hash === "fixture_shape_only_no_real_record_body_hash", "bad fixture record hash");
assert(packet.append_only_target_present === false, "fixture append-only target must be false");
assert(packet.pre_apply_backup_verified === false, "fixture backup verified must be false");
assert(packet.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(packet.operator_final_approval_present === false, "fixture final approval must be false");
assert(packet.packet_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(packet.packet_reason_codes.includes("no_real_duplicate_record_key_guard"), "duplicate guard reason missing");
assert(packet.packet_reason_codes.includes("no_operator_final_approval"), "operator approval reason missing");
assert(packet.packet_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(packet.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_execution_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_packet_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_packet_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-packet-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_packet_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_packet_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_packet_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_packet_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_packet_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_PACKET_HOLD_V1_GREEN"
