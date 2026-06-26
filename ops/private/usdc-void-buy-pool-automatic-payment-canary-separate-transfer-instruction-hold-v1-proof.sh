#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TRANSFER_INSTRUCTION_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-transfer-instruction-hold-v1"
doc="docs/private/$n.md"
instruction_fixture="fixtures/private/$n-instruction.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
exec_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-execution-authorization-hold-v1-authorize.example.json"
exec_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-execution-authorization-hold-v1-proof.sh"
live_path_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-transfer-instruction-live-path-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TRANSFER_INSTRUCTION_HOLD_V1"

test -f "$doc"
test -f "$instruction_fixture"
test -f "$hold_fixture"
test -f "$exec_fixture"
test -x "$exec_proof"
test -x "$live_path_proof"
python3 -m json.tool "$instruction_fixture" >/tmp/void-canary-separate-transfer-instruction-hold-v1-instruction.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-separate-transfer-instruction-hold-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$instruction_fixture" >/dev/null
grep -F "$marker" "$hold_fixture" >/dev/null
grep -F "does not execute fulfillment" "$doc" >/dev/null
grep -F "does not create a fulfillment record" "$doc" >/dev/null
grep -F "does not create an allocation claim" "$doc" >/dev/null
grep -F "does not authorize a signer" "$doc" >/dev/null
grep -F "does not expose wallet secrets" "$doc" >/dev/null
grep -F "does not expose a wallet address" "$doc" >/dev/null
grep -F "does not sign a wallet transaction" "$doc" >/dev/null
grep -F "does not transfer VOID" "$doc" >/dev/null
grep -F "does not broadcast a transaction" "$doc" >/dev/null
grep -F "does not create a public mutation route" "$doc" >/dev/null
grep -F "does not authorize buyer execution" "$doc" >/dev/null
grep -F "does not perform money movement" "$doc" >/dev/null
grep -F "does not mark fulfilled" "$doc" >/dev/null
echo "automatic_payment_canary_separate_transfer_instruction_hold_files_exist=true"
echo "automatic_payment_canary_separate_transfer_instruction_hold_marker_green=true"

python3 - "$instruction_fixture" "$hold_fixture" "$exec_fixture" <<'PY'
import json
import sys
from pathlib import Path

instruction = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
execauth = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TRANSFER_INSTRUCTION_HOLD_V1"
assert instruction["marker"] == marker
assert hold["marker"] == marker
assert instruction["state"] == "transfer_instruction_held_pending_signer_authorization_lane"
assert hold["state"] == "held_pending_transfer_instruction"

assert instruction["source_execution_authorization_marker"] == execauth["marker"]
assert hold["source_execution_authorization_marker"] == execauth["marker"]
assert execauth["state"] == "authorized_for_separate_transfer_instruction_lane"
assert instruction["source_operator_approval_marker"] == execauth["source_operator_approval_marker"]
assert instruction["source_packet_marker"] == execauth["source_packet_marker"]
assert instruction["source_preflight_marker"] == execauth["source_preflight_marker"]
assert instruction["source_closeout_marker"] == execauth["source_closeout_marker"]

for key in [
    "execution_authorization_id",
    "operator_approval_id",
    "fulfillment_packet_id",
    "allocation_record_id",
    "packet_id",
    "canonical_payment_identity",
    "reserved_void_amount",
    "inventory_remaining_after",
    "allocation_record_hash",
]:
    assert instruction[key] == execauth[key], key

assert instruction["transfer_void_amount"] == execauth["fulfillment_void_amount"]
assert instruction["transfer_void_amount"] == "200"
assert instruction["inventory_remaining_after"] == "0"
assert instruction["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

dest = instruction["destination_binding"]
assert dest["status"] == "withheld_private_operator_only"
assert dest["wallet_address_present"] is False
assert dest["wallet_secret_present"] is False
assert dest["private_key_present"] is False
assert dest["seed_phrase_present"] is False

assert instruction["instruction"]["instruction_shaped"] is True
assert instruction["instruction"]["instruction_scope"] == "transfer_instruction_shape_only_not_signing_not_broadcast"
assert instruction["instruction"]["requires_separate_signer_authorization"] is True
assert instruction["instruction"]["requires_separate_operator_execute"] is True
assert instruction["instruction"]["requires_separate_fulfillment_record"] is True
assert instruction["instruction"]["requires_separate_allocation_claim"] is True

assert hold["instruction"]["instruction_shaped"] is False
assert hold["instruction"]["instruction_scope"] == "held_no_instruction"

auth = instruction["authority"]
assert auth["transfer_instruction_recording_only"] is True
assert auth["transfer_instruction_creation_now"] is True
for key in [
    "signer_authorization_creation",
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
    "money_movement_now",
]:
    assert auth[key] is False, key

for key, value in hold["authority"].items():
    if key == "transfer_instruction_recording_only":
        assert value is True
    else:
        assert value is False, key

assert instruction["next_required_lane"] == "separate_signer_authorization_hold"

print("automatic_payment_canary_separate_transfer_instruction_hold_execution_authorization_binding_green=true")
print("automatic_payment_canary_separate_transfer_instruction_hold_instruction_state_green=true")
print("automatic_payment_canary_separate_transfer_instruction_hold_hold_state_green=true")
print("automatic_payment_canary_separate_transfer_instruction_hold_authority_boundary_green=true")
print("allocation_record_hash=" + instruction["allocation_record_hash"])
PY

echo
echo "== source execution authorization proof remains green =="
bash "$exec_proof"
echo "automatic_payment_canary_separate_transfer_instruction_hold_source_execution_authorization_green=true"

echo
echo "== live-path transfer instruction hold remains green =="
bash "$live_path_proof"
echo "automatic_payment_canary_separate_transfer_instruction_hold_live_path_hold_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$instruction_fixture" "$hold_fixture" >/tmp/void-canary-separate-transfer-instruction-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-transfer-instruction-hold-secret.out
  echo "automatic_payment_canary_separate_transfer_instruction_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_transfer_instruction_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-transfer-instruction-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-transfer-instruction-hold-doc-hex.out
  echo "automatic_payment_canary_separate_transfer_instruction_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_transfer_instruction_hold_doc_raw_key_like_hex_absent=true"
fi

python3 - "$instruction_fixture" "$hold_fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

instruction = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert instruction["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert instruction["destination_binding"]["wallet_address_present"] is False
assert instruction["destination_binding"]["wallet_secret_present"] is False
assert instruction["destination_binding"]["private_key_present"] is False
assert instruction["destination_binding"]["seed_phrase_present"] is False
assert "canonical_payment_identity" not in hold or hold.get("canonical_payment_identity") is None
print("automatic_payment_canary_separate_transfer_instruction_hold_placeholder_identity_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_transfer_instruction_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_transfer_instruction_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_transfer_instruction_hold_no_signer_authorization=true"
echo "automatic_payment_canary_separate_transfer_instruction_hold_no_execution=true"
echo "automatic_payment_canary_separate_transfer_instruction_hold_no_signing=true"
echo "automatic_payment_canary_separate_transfer_instruction_hold_no_transfer=true"
echo "automatic_payment_canary_separate_transfer_instruction_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_transfer_instruction_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_TRANSFER_INSTRUCTION_HOLD_V1_GREEN"
