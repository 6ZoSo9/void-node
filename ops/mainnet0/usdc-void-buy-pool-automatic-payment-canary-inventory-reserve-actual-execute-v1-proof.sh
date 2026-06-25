#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_V1"

doc="docs/private/$name.md"
execute="ops/mainnet0/$name.py"
policy_fixture="fixtures/private/$name-policy.example.json"

snapshot="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-pre-execute-backup-snapshot-v1.py"
auth_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-authorization-gate-v1.py"
authorize_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-actual-execute-authorization-gate-v1-authorize.example.json"
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
test -f "$execute"
test -f "$policy_fixture"
test -f "$snapshot"
test -f "$auth_gate"
test -f "$authorize_fixture"
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
echo "automatic_payment_canary_inventory_reserve_actual_execute_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$execute" >/dev/null
echo "automatic_payment_canary_inventory_reserve_actual_execute_marker_green=true"

bridge_out="$(mktemp)"
review_out="$(mktemp)"
allocation_out="$(mktemp)"
preflight_out="$(mktemp)"
approval_out="$(mktemp)"
packet_out="$(mktemp)"
dry_run_out="$(mktemp)"
auth_out="$(mktemp)"
snapshot_out="$(mktemp)"
actual_execute_out="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_review_fixture" python3 "$review_gate" > "$review_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$review_out" python3 "$allocation_gate" > "$allocation_out"
CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$preflight_policy" python3 "$preflight" > "$preflight_out"
CANARY_INVENTORY_RESERVE_PREFLIGHT_OUTPUT_JSON="$preflight_out" CANARY_INVENTORY_RESERVE_OPERATOR_DECISION_JSON="$approval_fixture" python3 "$approval_gate" > "$approval_out"
CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON="$approval_out" python3 "$packet_hold" > "$packet_out"
CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON="$packet_out" CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON="$dry_run_policy" python3 "$dry_run" > "$dry_run_out"
CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON="$dry_run_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON="$authorize_fixture" python3 "$auth_gate" > "$auth_out"
CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_OUTPUT_JSON="$auth_out" python3 "$snapshot" > "$snapshot_out"

CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_JSON="$snapshot_out" \
CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_POLICY_JSON="$policy_fixture" \
CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_OUTPUT_JSON="$actual_execute_out" \
python3 "$execute" > /tmp/void-canary-inventory-reserve-actual-execute-stdout.json

test -s "$actual_execute_out"

python3 - "$actual_execute_out" <<'PY'
import json
import sys
from pathlib import Path

d = json.loads(Path(sys.argv[1]).read_text())

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_V1"
assert d["ok"] is True
assert d["execute"]["state"] == "inventory_reserved_and_decremented"
assert d["execute"]["actual_inventory_reserve_execute_performed"] is True

r = d["actual_execute_result"]
assert r["actual_execute_result_kind"] == "automatic_payment_canary_inventory_reserve_actual_execute_result"
assert r["actual_execute_result_status"] == "inventory_reserved_pending_allocation_record_gate"
assert r["reserved_void_amount"] in ["2E+2", "200"]
assert r["inventory_remaining_before"] in ["2E+2", "200"]
assert r["inventory_remaining_after"] == "0"
assert r["inventory_reserved"] is True
assert r["inventory_decremented"] is True
assert r["allocation_record_created"] is False
assert r["private_allocation_ledger_written"] is False
assert r["fulfillment_executed"] is False
assert r["wallet_signing"] is False
assert r["void_transfer"] is False
assert r["public_mutation"] is False
assert r["canary"]["candidate_limit"] == 1
assert r["canary"]["candidate_reserved_count_after"] == 1
assert r["canary"]["process_one_candidate_then_stop"] is True
assert r["restore_source"]["inventory_remaining"] in ["2E+2", "200"]

auth = d["authority"]
assert auth["inventory_reserved"] is True
assert auth["inventory_decremented"] is True
for k in [
    "allocation_record_created",
    "private_allocation_ledger_write",
    "fulfillment_executed",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
]:
    assert auth[k] is False, k

print("automatic_payment_canary_inventory_reserve_actual_execute_semantics_green=true")
PY

tmp_bad_policy="$(mktemp)"
cat > "$tmp_bad_policy" <<'JSON'
{
  "actual_execute_policy_kind": "automatic_payment_canary_inventory_reserve_actual_execute_policy",
  "allow_inventory_reserve_mutation": true,
  "allow_inventory_decrement": true,
  "allow_allocation_record_creation": false,
  "allow_private_allocation_ledger_write": true,
  "allow_fulfillment_execution": false,
  "allow_wallet_signing": false,
  "allow_void_transfer": false,
  "allow_public_mutation": false,
  "expected_inventory_remaining_before": "200",
  "expected_inventory_remaining_after": "0",
  "canary_candidate_limit": 1,
  "canary_candidates_already_reserved": 0
}
JSON

if CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_JSON="$snapshot_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_POLICY_JSON="$tmp_bad_policy" python3 "$execute" >/tmp/void-canary-inventory-reserve-actual-execute-bad-policy.json 2>/dev/null; then
  echo "automatic_payment_canary_inventory_reserve_actual_execute_bad_policy_failed=true"
  exit 1
else
  echo "automatic_payment_canary_inventory_reserve_actual_execute_bad_policy_rejected=true"
fi

tmp_exhausted_policy="$(mktemp)"
cat > "$tmp_exhausted_policy" <<'JSON'
{
  "actual_execute_policy_kind": "automatic_payment_canary_inventory_reserve_actual_execute_policy",
  "allow_inventory_reserve_mutation": true,
  "allow_inventory_decrement": true,
  "allow_allocation_record_creation": false,
  "allow_private_allocation_ledger_write": false,
  "allow_fulfillment_execution": false,
  "allow_wallet_signing": false,
  "allow_void_transfer": false,
  "allow_public_mutation": false,
  "expected_inventory_remaining_before": "200",
  "expected_inventory_remaining_after": "0",
  "canary_candidate_limit": 1,
  "canary_candidates_already_reserved": 1
}
JSON

exhausted_out="$(CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_JSON="$snapshot_out" CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_POLICY_JSON="$tmp_exhausted_policy" python3 "$execute")"
printf '%s\n' "$exhausted_out" > /tmp/void-canary-inventory-reserve-actual-execute-exhausted.json

python3 - <<'PY'
import json
from pathlib import Path
d = json.loads(Path("/tmp/void-canary-inventory-reserve-actual-execute-exhausted.json").read_text())
assert d["ok"] is True
assert d["execute"]["state"] == "blocked_canary_candidate_limit_exhausted"
assert d["execute"]["actual_inventory_reserve_execute_performed"] is False
assert d["authority"]["inventory_reserved"] is False
assert d["authority"]["inventory_decremented"] is False
print("automatic_payment_canary_inventory_reserve_actual_execute_limit_block_green=true")
PY

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$execute" "$policy_fixture" && {
  echo "automatic_payment_canary_inventory_reserve_actual_execute_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_actual_execute_secret_leak_absent=true"

echo "${marker}_GREEN"
