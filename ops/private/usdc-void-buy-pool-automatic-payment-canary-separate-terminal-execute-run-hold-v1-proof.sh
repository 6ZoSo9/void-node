#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-terminal-execute-run-hold-v1"
doc="docs/private/$n.md"
run_fixture="fixtures/private/$n-run.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
packet_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-real-actual-execute-packet-hold-v1-packet.example.json"
packet_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-real-actual-execute-packet-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_HOLD_V1"

test -f "$doc"
test -f "$run_fixture"
test -f "$hold_fixture"
test -f "$packet_fixture"
test -x "$packet_proof"

python3 -m json.tool "$run_fixture" >/tmp/void-canary-terminal-execute-run-hold-v1-run.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-terminal-execute-run-hold-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$run_fixture" >/dev/null
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
echo "automatic_payment_canary_separate_terminal_execute_run_hold_files_exist=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_marker_green=true"

python3 - "$run_fixture" "$hold_fixture" "$packet_fixture" <<'PY'
import json
import sys
from pathlib import Path

run = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
packet = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_HOLD_V1"
assert run["marker"] == marker
assert hold["marker"] == marker
assert run["state"] == "terminal_execute_run_envelope_held_pending_terminal_execute_authorization"
assert hold["state"] == "held_pending_terminal_execute_run"

assert run["source_real_actual_execute_packet_marker"] == packet["marker"]
assert hold["source_real_actual_execute_packet_marker"] == packet["marker"]
assert packet["state"] == "real_actual_execute_packet_held_pending_terminal_execute_run"
assert packet["next_required_lane"] == "separate_terminal_execute_run_hold"

for key in [
    "real_actual_execute_packet_id",
    "real_actual_execute_decision_id",
    "actual_execute_gate_id",
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
    assert run[key] == packet[key], key

assert run["source_real_actual_execute_decision_marker"] == packet["source_real_actual_execute_decision_marker"]
assert run["source_actual_execute_gate_marker"] == packet["source_actual_execute_gate_marker"]
assert run["source_operator_execute_marker"] == packet["source_operator_execute_marker"]
assert run["source_signer_authorization_marker"] == packet["source_signer_authorization_marker"]
assert run["source_transfer_instruction_marker"] == packet["source_transfer_instruction_marker"]
assert run["source_execution_authorization_marker"] == packet["source_execution_authorization_marker"]

assert run["transfer_void_amount"] == "200"
assert run["reserved_void_amount"] == "200"
assert run["inventory_remaining_after"] == "0"
assert run["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

terminal_run = run["terminal_run"]
assert terminal_run["terminal_execute_run_envelope_shaped"] is True
assert terminal_run["terminal_execute_run_scope"] == "run_envelope_shape_only_not_execution_not_signing_not_broadcast"
assert terminal_run["terminal_execute_authorization_required"] is True
assert terminal_run["terminal_execute_authorization_present"] is False
assert terminal_run["terminal_execute_run_executed"] is False
assert terminal_run["terminal_execute_run_signed"] is False
assert terminal_run["terminal_execute_run_broadcast"] is False
assert terminal_run["requires_separate_fulfillment_record"] is True
assert terminal_run["requires_separate_allocation_claim"] is True

hold_run = hold["terminal_run"]
assert hold_run["terminal_execute_run_envelope_shaped"] is False
assert hold_run["terminal_execute_run_scope"] == "held_no_terminal_execute_run_envelope"
assert hold_run["terminal_execute_authorization_required"] is True
assert hold_run["terminal_execute_authorization_present"] is False
assert hold_run["terminal_execute_run_executed"] is False
assert hold_run["terminal_execute_run_signed"] is False
assert hold_run["terminal_execute_run_broadcast"] is False

auth = run["authority"]
assert auth["terminal_run_recording_only"] is True
assert auth["terminal_run_envelope_creation_now"] is True
for key in [
    "terminal_execute_authorized_now",
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
    if key == "terminal_run_recording_only":
        assert value is True
    else:
        assert value is False, key

assert run["next_required_lane"] == "separate_terminal_execute_authorization_hold"

print("automatic_payment_canary_separate_terminal_execute_run_hold_packet_binding_green=true")
print("automatic_payment_canary_separate_terminal_execute_run_hold_run_state_green=true")
print("automatic_payment_canary_separate_terminal_execute_run_hold_hold_state_green=true")
print("automatic_payment_canary_separate_terminal_execute_run_hold_authority_boundary_green=true")
print("allocation_record_hash=" + run["allocation_record_hash"])
PY

echo
echo "== source real actual execute packet proof remains green =="
bash "$packet_proof"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_source_packet_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$run_fixture" "$hold_fixture" >/tmp/void-canary-terminal-execute-run-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-terminal-execute-run-hold-secret.out
  echo "automatic_payment_canary_separate_terminal_execute_run_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_terminal_execute_run_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-terminal-execute-run-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-terminal-execute-run-hold-doc-hex.out
  echo "automatic_payment_canary_separate_terminal_execute_run_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_terminal_execute_run_hold_doc_raw_key_like_hex_absent=true"
fi

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_terminal_execute_run_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_terminal_execute_run_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_terminal_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_execution=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_signing=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_transfer=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_terminal_execute_run_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TERMINAL_EXECUTE_RUN_HOLD_V1_GREEN"
