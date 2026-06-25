#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-candidate-review-gate-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_REVIEW_GATE_V1"

doc="docs/private/$name.md"
gate="ops/mainnet0/$name.py"
approve_fixture="fixtures/private/$name-approve.example.json"
hold_fixture="fixtures/private/$name-hold.example.json"

bridge="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1.py"
valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
rate_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-rate-limited.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$gate"
test -f "$approve_fixture"
test -f "$hold_fixture"
test -f "$bridge"
test -f "$valid_rpc"
test -f "$rate_rpc"
test -f "$candidate_input"
echo "automatic_payment_canary_candidate_review_gate_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$gate" >/dev/null
echo "automatic_payment_canary_candidate_review_gate_marker_green=true"

eligible_bridge="$(mktemp)"
held_bridge="$(mktemp)"

RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$eligible_bridge"
RPC_OUTCOME_INPUT_JSON="$rate_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge" > "$held_bridge"

approve_out="$(CANARY_BRIDGE_OUTPUT_JSON="$eligible_bridge" CANARY_CANDIDATE_REVIEW_JSON="$approve_fixture" python3 "$gate")"
hold_out="$(CANARY_BRIDGE_OUTPUT_JSON="$eligible_bridge" CANARY_CANDIDATE_REVIEW_JSON="$hold_fixture" python3 "$gate")"
blocked_out="$(CANARY_BRIDGE_OUTPUT_JSON="$held_bridge" CANARY_CANDIDATE_REVIEW_JSON="$approve_fixture" python3 "$gate")"

printf '%s\n' "$approve_out" > /tmp/void-canary-candidate-review-approve.json
printf '%s\n' "$hold_out" > /tmp/void-canary-candidate-review-hold.json
printf '%s\n' "$blocked_out" > /tmp/void-canary-candidate-review-blocked.json

python3 - <<'PY'
import json
from pathlib import Path

approve = json.loads(Path("/tmp/void-canary-candidate-review-approve.json").read_text())
hold = json.loads(Path("/tmp/void-canary-candidate-review-hold.json").read_text())
blocked = json.loads(Path("/tmp/void-canary-candidate-review-blocked.json").read_text())

assert approve["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_REVIEW_GATE_V1"
assert approve["ok"] is True
assert approve["review"]["state"] == "approved_for_allocation_candidate"
assert approve["review"]["approved_for_allocation_candidate"] is True
assert approve["candidate"]["candidate_kind"] == "automatic_payment_canary_candidate"
assert approve["authority"]["allocation_candidate_approved"] is True

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
    assert approve["authority"][k] is False, k

assert hold["ok"] is True
assert hold["review"]["state"] == "held_for_operator_review"
assert hold["review"]["approved_for_allocation_candidate"] is False
assert hold["authority"]["allocation_candidate_approved"] is False
assert hold["authority"]["inventory_reserved"] is False
assert hold["authority"]["void_transfer"] is False

assert blocked["ok"] is True
assert blocked["review"]["state"] == "held_bridge_did_not_build_candidate"
assert blocked["review"]["approved_for_allocation_candidate"] is False
assert blocked["authority"]["allocation_candidate_approved"] is False
assert blocked["authority"]["private_allocation_ledger_write"] is False
assert blocked["authority"]["void_transfer"] is False

print("automatic_payment_canary_candidate_review_gate_semantics_green=true")
PY

tmp_bad="$(mktemp)"
cat > "$tmp_bad" <<'JSON'
{
  "operator_review_decision": "approve_and_execute_now",
  "reviewer": "operator",
  "review_note": "bad decision"
}
JSON

if CANARY_BRIDGE_OUTPUT_JSON="$eligible_bridge" CANARY_CANDIDATE_REVIEW_JSON="$tmp_bad" python3 "$gate" >/tmp/void-canary-candidate-review-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_candidate_review_gate_bad_decision_failed=true"
  exit 1
else
  echo "automatic_payment_canary_candidate_review_gate_bad_decision_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$gate" "$approve_fixture" "$hold_fixture" && {
  echo "automatic_payment_canary_candidate_review_gate_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_candidate_review_gate_secret_leak_absent=true"

echo "${marker}_GREEN"
