#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_ACTUAL_EXECUTE_GATE_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-actual-execute-gate-hold-v1"
doc="docs/private/$n.md"
gate_fixture="fixtures/private/$n-gate.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
operator_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-operator-execute-hold-v1-execute.example.json"
operator_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-operator-execute-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_ACTUAL_EXECUTE_GATE_HOLD_V1"

test -f "$doc"
test -f "$gate_fixture"
test -f "$hold_fixture"
test -f "$operator_fixture"
test -x "$operator_proof"

python3 -m json.tool "$gate_fixture" >/tmp/void-canary-actual-execute-gate-hold-v1-gate.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-actual-execute-gate-hold-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$gate_fixture" >/dev/null
grep -F "$marker" "$hold_fixture" >/dev/null
for phrase in \
  "does not execute fulfillment" \
  "does not create a fulfillment record" \
  "does not create an allocation claim" \
  "does not expose wallet secrets" \
  "does not expose a wallet address" \
  "does not expose a private key" \
  "does not expose a seed phrase" \
  "does not grant signer access" \
  "does not sign a wallet transaction" \
  "does not transfer VOID" \
  "does not broadcast a transaction" \
  "does not create a public mutation route" \
  "does not authorize buyer execution" \
  "does not perform money movement" \
  "does not mark fulfilled"
do
  grep -F "$phrase" "$doc" >/dev/null
done
echo "automatic_payment_canary_separate_actual_execute_gate_hold_files_exist=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_marker_green=true"

python3 - "$gate_fixture" "$hold_fixture" "$operator_fixture" <<'PY'
import json
import sys
from pathlib import Path

gate = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
operator = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_ACTUAL_EXECUTE_GATE_HOLD_V1"
assert gate["marker"] == marker
assert hold["marker"] == marker
assert gate["state"] == "actual_execute_gate_held_pending_real_execute_decision"
assert hold["state"] == "held_pending_actual_execute_gate"

assert gate["source_operator_execute_marker"] == operator["marker"]
assert hold["source_operator_execute_marker"] == operator["marker"]
assert operator["state"] == "operator_execute_packet_held_pending_actual_execute_gate"
assert operator["next_required_lane"] == "separate_actual_execute_gate"

for key in [
    "operator_execute_hold_id",
    "signer_authorization_id",
    "transfer_instruction_id",
    "execution_authorization_id",
    "allocation_record_id",
    "canonical_payment_identity",
    "reserved_void_amount",
    "transfer_void_amount",
    "inventory_remaining_after",
    "allocation_record_hash"
]:
    assert gate[key] == operator[key], key

assert gate["transfer_void_amount"] == "200"
assert gate["reserved_void_amount"] == "200"
assert gate["inventory_remaining_after"] == "0"
assert gate["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

assert gate["gate"]["actual_execute_gate_shaped"] is True
assert gate["gate"]["actual_execute_gate_open_now"] is False
assert gate["gate"]["real_execute_decision_required"] is True
assert gate["gate"]["real_execute_decision_present"] is False
assert gate["gate"]["requires_separate_real_actual_execute"] is True
assert gate["gate"]["requires_separate_fulfillment_record"] is True
assert gate["gate"]["requires_separate_allocation_claim"] is True

assert hold["gate"]["actual_execute_gate_shaped"] is False
assert hold["gate"]["actual_execute_gate_open_now"] is False
assert hold["gate"]["real_execute_decision_required"] is True
assert hold["gate"]["real_execute_decision_present"] is False

auth = gate["authority"]
assert auth["actual_execute_gate_recording_only"] is True
assert auth["actual_execute_gate_creation_now"] is True
for key in [
    "actual_execute_authorized_now",
    "signer_access",
    "wallet_signing",
    "void_transfer",
    "transaction_broadcast",
    "fulfillment_execution",
    "fulfilled_state",
    "fulfillment_record_creation",
    "allocation_claim_creation",
    "public_mutation",
    "public_buyer_execution",
    "money_movement_now"
]:
    assert auth[key] is False, key

for key, value in hold["authority"].items():
    if key == "actual_execute_gate_recording_only":
        assert value is True
    else:
        assert value is False, key

assert gate["next_required_lane"] == "separate_real_actual_execute_decision"

print("automatic_payment_canary_separate_actual_execute_gate_hold_operator_execute_binding_green=true")
print("automatic_payment_canary_separate_actual_execute_gate_hold_gate_state_green=true")
print("automatic_payment_canary_separate_actual_execute_gate_hold_hold_state_green=true")
print("automatic_payment_canary_separate_actual_execute_gate_hold_authority_boundary_green=true")
print("allocation_record_hash=" + gate["allocation_record_hash"])
PY

echo
echo "== source operator execute proof remains green =="
bash "$operator_proof"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_source_operator_execute_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$gate_fixture" "$hold_fixture" >/tmp/void-canary-actual-execute-gate-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-actual-execute-gate-hold-secret.out
  echo "automatic_payment_canary_separate_actual_execute_gate_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_actual_execute_gate_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-actual-execute-gate-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-actual-execute-gate-hold-doc-hex.out
  echo "automatic_payment_canary_separate_actual_execute_gate_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_actual_execute_gate_hold_doc_raw_key_like_hex_absent=true"
fi

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_actual_execute_gate_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_actual_execute_gate_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_execution=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_signing=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_transfer=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_actual_execute_gate_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_ACTUAL_EXECUTE_GATE_HOLD_V1_GREEN"
