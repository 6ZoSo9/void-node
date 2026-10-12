#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_READINESS_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-readiness-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-readiness-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_READINESS_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_packet" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-readiness-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_READINESS_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply", "bad prior state");
assert(Array.isArray(fixture.allowed_write_apply_readiness_states), "allowed states missing");
assert(fixture.allowed_write_apply_readiness_states.includes("ready_for_separate_manual_fulfillment_record_write_apply_packet"), "write apply packet ready state missing");
assert(fixture.write_apply_readiness_state === "held_manual_fulfillment_record_write_apply_readiness_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

assert(fixture.authority.public_route_mounted === false, "public route mounted");
assert(fixture.authority.public_node_mutation_authority === false, "public mutation authority true");
assert(fixture.authority.manual_fulfillment_record_write_authority === false, "record write authority true");
assert(fixture.authority.manual_fulfillment_record_apply_authority === false, "record apply authority true");
assert(fixture.authority.append_only_ledger_write_authority === false, "append only ledger write authority true");
assert(fixture.authority.allocation_claim_creation_authority === false, "allocation claim authority true");
assert(fixture.authority.void_transfer_authority === false, "void transfer authority true");
assert(fixture.authority.wallet_signing_authority === false, "wallet signing authority true");
assert(fixture.authority.automatic_fulfillment_authority === false, "automatic fulfillment authority true");

const readiness = fixture.proposed_write_apply_readiness;
assert(readiness.write_apply_packet_ready === false, "fixture write apply packet ready should be false");
assert(readiness.append_only_target_present === false, "fixture append only target must be false");
assert(readiness.pre_apply_backup_required === true, "pre apply backup required must be true");
assert(readiness.pre_apply_backup_present === false, "fixture pre apply backup present must be false");
assert(readiness.duplicate_record_key_guard_required === true, "duplicate record key guard required must be true");
assert(readiness.duplicate_record_key_guard_passed === false, "fixture duplicate guard passed must be false");
assert(readiness.proposed_void_allocation_amount === "0", "fixture allocation amount must be zero");
assert(readiness.readiness_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(readiness.readiness_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(readiness.next_required_operator_action === "separate_manual_fulfillment_record_write_apply_packet_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-apply-readiness-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_apply_readiness_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_APPLY_READINESS_HOLD_V1_GREEN"
