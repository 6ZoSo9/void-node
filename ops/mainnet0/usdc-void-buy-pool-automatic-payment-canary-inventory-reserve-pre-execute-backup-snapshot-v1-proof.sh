#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-pre-execute-backup-snapshot-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_V1"

doc="docs/private/$name.md"
snapshot="ops/mainnet0/$name.py"

auth_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-authorization-gate-v1.py"
authorize_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-authorization-gate-v1-authorize.example.json"
hold_auth_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-authorization-gate-v1-hold.example.json"

dry_run="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-dry-run-v1.py"
dry_run_policy="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-dry-run-v1-policy.example.json"
packet_hold="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-execution-packet-hold-v1.py"
approval_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1.py"
approval_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-operator-approval-gate-v1-approve.example.json"
preflight="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1.py"
preflight_policy="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1-policy.example.json"
allocation_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-allocation-candidate-gate-v1.py"
review_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1.py"
bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"

valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"
approve_review_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-approve.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$snapshot"
test -f "$auth_gate"
test -f "$authorize_fixture"
test -f "$hold_auth_fixture"
test -f "$dry_run"
test -f "$dry_run_policy"
test -f "$packet_hold"
test -f "$approval_gate"
test -f "$approval_fixture"
test -f "$preflight"
test -f "$preflight_policy"
test -f "$allocation_gate"
test -f "$review_gate"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$candidate_input"
test -f "$approve_review_fixture"
echo "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$snapshot" >/dev/null
echo "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_marker_green=true"

bridge_out="$(mktemp)"
review_out="$(mktemp)"
allocation_out="$(mktemp)"
preflight_out="$(mktemp)"
approval_out="$(mktemp)"
packet_out="$(mktemp)"
dry_run_out="$(mktemp)"
auth_out="$(mktemp)"
held_auth_out="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_review_fixture" python3 "$review_gate" > "$review_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$review_out" python3 "$allocation_gate" > "$allocation_out"
CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$preflight_policy" python3 "$preflight" > "$preflight_out"
CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approval_fixture" python3 "$approval_gate" > "$approval_out"
CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$approval_out" python3 "$packet_hold" > "$packet_out"
CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON="$packet_out" CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON="$dry_run_policy" python3 "$dry_run" > "$dry_run_out"

CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON="$dry_run_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON="$authorize_fixture" python3 "$auth_gate" > "$auth_out"
CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON="$dry_run_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON="$hold_auth_fixture" python3 "$auth_gate" > "$held_auth_out"

snapshot_out="$(CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_OUTPUT_JSON="$auth_out" python3 "$snapshot")"
blocked_out="$(CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_OUTPUT_JSON="$held_auth_out" python3 "$snapshot")"

printf '%s\n' "$snapshot_out" > /tmp/void-canary-inventory-reserve-pre-execute-backup-snapshot.json
printf '%s\n' "$blocked_out" > /tmp/void-canary-inventory-reserve-pre-execute-backup-snapshot-blocked.json

python3 - <<'PY'
import json
from pathlib import Path

snap = json.loads(Path("/tmp/void-canary-inventory-reserve-pre-execute-backup-snapshot.json").read_text())
blocked = json.loads(Path("/tmp/void-canary-inventory-reserve-pre-execute-backup-snapshot-blocked.json").read_text())

assert snap["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_V1"
assert snap["ok"] is True
assert snap["backup"]["state"] == "pre_execute_backup_snapshot_created"
assert snap["backup"]["pre_execute_backup_snapshot_created"] is True

s = snap["snapshot"]
assert s["backup_snapshot_kind"] == "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot"
assert s["backup_snapshot_status"] == "created_pending_separate_actual_inventory_reserve_execute"
assert s["requested_void_amount"] in ["2E+2", "200"]
assert s["inventory_remaining_before"] in ["2E+2", "200"]
assert s["inventory_remaining_after_if_executed"] == "0"

restore = s["restore_target_if_execute_fails"]
assert restore["inventory_remaining"] in ["2E+2", "200"]
assert restore["inventory_reserved"] is False
assert restore["inventory_decremented"] is False
assert restore["allocation_record_created"] is False
assert restore["private_allocation_ledger_written"] is False

boundary = s["execute_boundary"]
assert boundary["separate_actual_execute_required"] is True
assert boundary["this_snapshot_executes_now"] is False
assert boundary["inventory_reserved_now"] is False
assert boundary["inventory_decremented_now"] is False
assert boundary["ledger_written_now"] is False
assert boundary["fulfillment_executed_now"] is False
assert boundary["wallet_signing_now"] is False
assert boundary["void_transfer_now"] is False

auth = snap["authority"]
assert auth["pre_execute_backup_snapshot_created"] is True
for k in [
    "inventory_reserved",
    "inventory_decremented",
    "allocation_record_created",
    "private_allocation_ledger_write",
    "fulfillment_executed",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
]:
    assert auth[k] is False, k

assert blocked["ok"] is True
assert blocked["backup"]["state"] == "blocked_authorization_not_authorized"
assert blocked["backup"]["pre_execute_backup_snapshot_created"] is False
assert blocked["snapshot"] is None
assert blocked["authority"]["pre_execute_backup_snapshot_created"] is False
assert blocked["authority"]["inventory_reserved"] is False
assert blocked["authority"]["void_transfer"] is False

print("automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_semantics_green=true")
PY

tmp_bad="$(mktemp)"
cat > "$tmp_bad" <<'JSON'
{
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_GATE_V1",
  "ok": true,
  "authorization": {
    "state": "authorized_for_separate_actual_inventory_reserve_execute",
    "authorized_for_separate_actual_inventory_reserve_execute": true
  },
  "dry_run_result": {
    "dry_run_result_kind": "automatic_payment_canary_inventory_reserve_execution_dry_run_result",
    "dry_run_result_status": "ready_for_separate_actual_execute_review",
    "actual_inventory_mutation_performed": true
  }
}
JSON

if CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_OUTPUT_JSON="$tmp_bad" python3 "$snapshot" >/tmp/void-canary-inventory-reserve-pre-execute-backup-snapshot-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_bad_mutation_failed=true"
  exit 1
else
  echo "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_bad_mutation_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$snapshot" && {
  echo "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot_secret_leak_absent=true"

echo "${marker}_GREEN"
