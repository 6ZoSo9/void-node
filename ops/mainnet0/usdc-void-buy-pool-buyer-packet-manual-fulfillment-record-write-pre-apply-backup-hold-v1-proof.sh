#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_PRE_APPLY_BACKUP_HOLD_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-pre-apply-backup-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-pre-apply-backup-hold-v1.json"
marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_PRE_APPLY_BACKUP_HOLD_V1"

test -f "$doc"
test -f "$fixture"

grep -q "$marker" "$doc"
grep -q "$marker" "$fixture"

grep -q "private/operator-only" "$doc"
grep -q "ready_for_separate_manual_fulfillment_record_write_apply_packet" "$doc"
grep -q "ready_for_separate_duplicate_record_key_guard_hold" "$doc"
grep -q "must not be mounted as a public-node route" "$doc"

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/private/usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-pre-apply-backup-hold-v1.json", "utf8"));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_PRE_APPLY_BACKUP_HOLD_V1", "bad marker");
assert(fixture.scope === "private_operator_only", "bad scope");
assert(fixture.prior_required_state === "ready_for_separate_manual_fulfillment_record_write_apply_packet", "bad prior state");
assert(Array.isArray(fixture.allowed_pre_apply_backup_hold_states), "allowed states missing");
assert(fixture.allowed_pre_apply_backup_hold_states.includes("ready_for_separate_duplicate_record_key_guard_hold"), "next guard state missing");
assert(fixture.pre_apply_backup_hold_state === "held_pre_apply_backup_shape_only", "bad fixture hold state");

for (const [key, value] of Object.entries(fixture.authority)) {
  assert(value === false, `authority not false: ${key}`);
}

const backup = fixture.proposed_pre_apply_backup;
assert(backup.backup_required === true, "backup must be required");
assert(backup.backup_created === false, "fixture must not create backup");
assert(backup.backup_verified === false, "fixture must not verify backup");
assert(backup.append_only_target_present === false, "fixture append-only target must be false");
assert(backup.backup_reason_codes.includes("fixture_shape_only"), "fixture shape reason missing");
assert(backup.backup_reason_codes.includes("no_record_written"), "no record written reason missing");
assert(backup.next_required_operator_action === "separate_duplicate_record_key_guard_hold_required", "bad next action");

console.log("buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_json_semantics_green=true");
NODE

if grep -R "$marker" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_public_leak=false"
  exit 1
fi

if grep -R "usdc-void-buy-pool-buyer-packet-manual-fulfillment-record-write-pre-apply-backup-hold-v1" src docs/public fixtures/public 2>/dev/null; then
  echo "buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_public_route_absent=false"
  exit 1
fi

echo "buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_doc_green=true"
echo "buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_fixture_green=true"
echo "buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_no_public_route_green=true"
echo "buyer_packet_manual_fulfillment_record_write_pre_apply_backup_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_RECORD_WRITE_PRE_APPLY_BACKUP_HOLD_V1_GREEN"
