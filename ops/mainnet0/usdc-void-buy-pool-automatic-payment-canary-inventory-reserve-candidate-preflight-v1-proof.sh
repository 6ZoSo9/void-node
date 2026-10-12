#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-inventory-reserve-candidate-preflight-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_CANDIDATE_PREFLIGHT_V1"

doc="docs/private/$name.md"
preflight="ops/mainnet0/$name.py"
policy_fixture="fixtures/private/$name-policy.example.json"

allocation_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-allocation-candidate-gate-v1.py"
review_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1.py"
bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"

valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"
approve_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-approve.example.json"
hold_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-hold.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$preflight"
test -f "$policy_fixture"
test -f "$allocation_gate"
test -f "$review_gate"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$candidate_input"
test -f "$approve_fixture"
test -f "$hold_fixture"
echo "automatic_payment_canary_inventory_reserve_candidate_preflight_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$preflight" >/dev/null
echo "automatic_payment_canary_inventory_reserve_candidate_preflight_marker_green=true"

bridge_out="$(mktemp)"
approved_review="$(mktemp)"
held_review="$(mktemp)"
allocation_out="$(mktemp)"
blocked_allocation_out="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"

CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_fixture" python3 "$review_gate" > "$approved_review"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$hold_fixture" python3 "$review_gate" > "$held_review"

CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$approved_review" python3 "$allocation_gate" > "$allocation_out"
CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$held_review" python3 "$allocation_gate" > "$blocked_allocation_out"

eligible_out="$(CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$policy_fixture" python3 "$preflight")"
blocked_out="$(CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$blocked_allocation_out" CANARY_INVENTORY_POLICY_JSON="$policy_fixture" python3 "$preflight")"

printf '%s\n' "$eligible_out" > /tmp/void-canary-inventory-reserve-candidate-eligible.json
printf '%s\n' "$blocked_out" > /tmp/void-canary-inventory-reserve-candidate-blocked.json

python3 - <<'PY'
import json
from pathlib import Path

eligible = json.loads(Path("/tmp/void-canary-inventory-reserve-candidate-eligible.json").read_text())
blocked = json.loads(Path("/tmp/void-canary-inventory-reserve-candidate-blocked.json").read_text())

assert eligible["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_CANDIDATE_PREFLIGHT_V1"
assert eligible["ok"] is True
assert eligible["preflight"]["state"] == "inventory_reserve_candidate_eligible"
assert eligible["preflight"]["inventory_reserve_candidate_eligible"] is True

r = eligible["inventory_reserve_candidate"]
assert r["inventory_reserve_candidate_kind"] == "automatic_payment_canary_inventory_reserve_candidate"
assert r["inventory_reserve_candidate_status"] == "eligible_pending_operator_actual_reserve"
assert r["requested_void_amount"] in ["2E+2", "200"]
assert r["canary_inventory_remaining_void_before"] in ["2E+2", "200"]
assert r["canary_inventory_remaining_void_after_if_reserved"] == "0"
assert r["operator_review_required_before_actual_reserve"] is True

auth = eligible["authority"]
assert auth["inventory_reserve_candidate_created"] is True
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
assert blocked["preflight"]["state"] == "blocked_allocation_candidate_not_created"
assert blocked["preflight"]["inventory_reserve_candidate_eligible"] is False
assert blocked["inventory_reserve_candidate"] is None
assert blocked["authority"]["inventory_reserve_candidate_created"] is False
assert blocked["authority"]["inventory_reserved"] is False
assert blocked["authority"]["void_transfer"] is False

print("automatic_payment_canary_inventory_reserve_candidate_preflight_semantics_green=true")
PY

tmp_exhausted="$(mktemp)"
cat > "$tmp_exhausted" <<'JSON'
{
  "inventory_policy_kind": "automatic_payment_canary_inventory_reserve_candidate_policy",
  "canary_inventory_total_void": "200",
  "canary_inventory_remaining_void": "200",
  "canary_candidate_limit": 1,
  "canary_candidates_already_reserved": 1,
  "operator_review_required_before_actual_reserve": true
}
JSON

exhausted_out="$(CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON="$allocation_out" CANARY_INVENTORY_POLICY_JSON="$tmp_exhausted" python3 "$preflight")"
printf '%s\n' "$exhausted_out" > /tmp/void-canary-inventory-reserve-candidate-exhausted.json

python3 - <<'PY'
import json
from pathlib import Path
d = json.loads(Path("/tmp/void-canary-inventory-reserve-candidate-exhausted.json").read_text())
assert d["ok"] is True
assert d["preflight"]["state"] == "blocked_canary_candidate_limit_exhausted"
assert d["preflight"]["inventory_reserve_candidate_eligible"] is False
assert d["authority"]["inventory_reserved"] is False
print("automatic_payment_canary_inventory_reserve_candidate_preflight_limit_block_green=true")
PY

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$preflight" "$policy_fixture" && {
  echo "automatic_payment_canary_inventory_reserve_candidate_preflight_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_inventory_reserve_candidate_preflight_secret_leak_absent=true"

echo "${marker}_GREEN"
