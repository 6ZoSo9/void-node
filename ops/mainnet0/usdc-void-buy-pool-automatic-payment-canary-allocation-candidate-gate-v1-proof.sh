#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-allocation-candidate-gate-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_CANDIDATE_GATE_V1"

doc="docs/private/$name.md"
gate="ops/mainnet0/$name.py"

review_gate="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1.py"
approve_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-approve.example.json"
hold_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1-hold.example.json"

bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"
valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$gate"
test -f "$review_gate"
test -f "$approve_fixture"
test -f "$hold_fixture"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$candidate_input"
echo "automatic_payment_canary_allocation_candidate_gate_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$gate" >/dev/null
echo "automatic_payment_canary_allocation_candidate_gate_marker_green=true"

bridge_out="$(mktemp)"
approved_review="$(mktemp)"
held_review="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$bridge_out"

CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$approve_fixture" python3 "$review_gate" > "$approved_review"
CANARY_BRIDGE_OUTPUT_JSON="$bridge_out" CANARY_CANDIDATE_REVIEW_JSON="$hold_fixture" python3 "$review_gate" > "$held_review"

approved_out="$(CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$approved_review" python3 "$gate")"
held_out="$(CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$held_review" python3 "$gate")"

printf '%s\n' "$approved_out" > /tmp/void-canary-allocation-candidate-approved.json
printf '%s\n' "$held_out" > /tmp/void-canary-allocation-candidate-held.json

python3 - <<'PY'
import json
from pathlib import Path

approved = json.loads(Path("/tmp/void-canary-allocation-candidate-approved.json").read_text())
held = json.loads(Path("/tmp/void-canary-allocation-candidate-held.json").read_text())

assert approved["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_CANDIDATE_GATE_V1"
assert approved["ok"] is True
assert approved["gate"]["state"] == "allocation_candidate_created"
assert approved["gate"]["allocation_candidate_created"] is True

a = approved["allocation_candidate"]
assert a["allocation_candidate_kind"] == "automatic_payment_canary_allocation_candidate"
assert a["allocation_candidate_status"] == "created_pending_inventory_reserve_gate"
assert a["source_candidate_kind"] == "automatic_payment_canary_candidate"
assert a["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert a["amount_usdc"] == "100"
assert a["void_amount"] == "200"
assert a["canary"]["candidate_limit"] == 1
assert a["canary"]["allocation_candidate_created"] is True
assert a["canary"]["operator_review_required_before_inventory_reserve"] is True

auth = approved["authority"]
assert auth["allocation_candidate_created"] is True
for k in [
    "allocation_record_created",
    "private_allocation_ledger_write",
    "inventory_reserved",
    "fulfillment_executed",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
]:
    assert auth[k] is False, k

assert held["ok"] is True
assert held["gate"]["state"] == "blocked_review_not_approved"
assert held["gate"]["allocation_candidate_created"] is False
assert held["allocation_candidate"] is None
assert held["authority"]["allocation_candidate_created"] is False
assert held["authority"]["private_allocation_ledger_write"] is False
assert held["authority"]["inventory_reserved"] is False
assert held["authority"]["void_transfer"] is False

print("automatic_payment_canary_allocation_candidate_gate_semantics_green=true")
PY

tmp_bad="$(mktemp)"
cat > "$tmp_bad" <<'JSON'
{
  "marker": "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_REVIEW_GATE_V1",
  "ok": true,
  "review": {
    "state": "approved_for_allocation_candidate",
    "decision": "approve_for_allocation_candidate",
    "approved_for_allocation_candidate": true
  },
  "candidate": {
    "candidate_kind": "wrong_kind"
  }
}
JSON

if CANARY_CANDIDATE_REVIEW_OUTPUT_JSON="$tmp_bad" python3 "$gate" >/tmp/void-canary-allocation-candidate-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_allocation_candidate_gate_bad_kind_failed=true"
  exit 1
else
  echo "automatic_payment_canary_allocation_candidate_gate_bad_kind_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED' "$doc" "$gate" && {
  echo "automatic_payment_canary_allocation_candidate_gate_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_allocation_candidate_gate_secret_leak_absent=true"

echo "${marker}_GREEN"
