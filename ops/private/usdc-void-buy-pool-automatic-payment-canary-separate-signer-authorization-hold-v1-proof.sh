#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_SIGNER_AUTHORIZATION_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-signer-authorization-hold-v1"
doc="docs/private/$n.md"
signer_fixture="fixtures/private/$n-signer.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
transfer_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-transfer-instruction-hold-v1-instruction.example.json"
transfer_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-transfer-instruction-hold-v1-proof.sh"
live_path_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_SIGNER_AUTHORIZATION_HOLD_V1"

test -f "$doc"
test -f "$signer_fixture"
test -f "$hold_fixture"
test -f "$transfer_fixture"
test -x "$transfer_proof"
test -x "$live_path_proof"
python3 -m json.tool "$signer_fixture" >/tmp/void-canary-separate-signer-authorization-hold-v1-signer.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-separate-signer-authorization-hold-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$signer_fixture" >/dev/null
grep -F "$marker" "$hold_fixture" >/dev/null
grep -F "does not execute fulfillment" "$doc" >/dev/null
grep -F "does not create a fulfillment record" "$doc" >/dev/null
grep -F "does not create an allocation claim" "$doc" >/dev/null
grep -F "does not expose wallet secrets" "$doc" >/dev/null
grep -F "does not expose a wallet address" "$doc" >/dev/null
grep -F "does not expose a private key" "$doc" >/dev/null
grep -F "does not expose a seed phrase" "$doc" >/dev/null
grep -F "does not grant signer access" "$doc" >/dev/null
grep -F "does not sign a wallet transaction" "$doc" >/dev/null
grep -F "does not transfer VOID" "$doc" >/dev/null
grep -F "does not broadcast a transaction" "$doc" >/dev/null
grep -F "does not create a public mutation route" "$doc" >/dev/null
grep -F "does not authorize buyer execution" "$doc" >/dev/null
grep -F "does not perform money movement" "$doc" >/dev/null
grep -F "does not mark fulfilled" "$doc" >/dev/null
echo "automatic_payment_canary_separate_signer_authorization_hold_files_exist=true"
echo "automatic_payment_canary_separate_signer_authorization_hold_marker_green=true"

python3 - "$signer_fixture" "$hold_fixture" "$transfer_fixture" <<'PY'
import json
import sys
from pathlib import Path

signer = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
transfer = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_SIGNER_AUTHORIZATION_HOLD_V1"
assert signer["marker"] == marker
assert hold["marker"] == marker
assert signer["state"] == "signer_authorization_held_pending_operator_execute_lane"
assert hold["state"] == "held_pending_signer_authorization"

assert signer["source_transfer_instruction_marker"] == transfer["marker"]
assert hold["source_transfer_instruction_marker"] == transfer["marker"]
assert transfer["state"] == "transfer_instruction_held_pending_signer_authorization_lane"
assert transfer["next_required_lane"] == "separate_signer_authorization_hold"
assert signer["source_execution_authorization_marker"] == transfer["source_execution_authorization_marker"]
assert signer["source_operator_approval_marker"] == transfer["source_operator_approval_marker"]
assert signer["source_packet_marker"] == transfer["source_packet_marker"]
assert signer["source_preflight_marker"] == transfer["source_preflight_marker"]
assert signer["source_closeout_marker"] == transfer["source_closeout_marker"]

for key in [
    "transfer_instruction_id",
    "execution_authorization_id",
    "operator_approval_id",
    "fulfillment_packet_id",
    "allocation_record_id",
    "packet_id",
    "canonical_payment_identity",
    "reserved_void_amount",
    "transfer_void_amount",
    "inventory_remaining_after",
    "allocation_record_hash",
]:
    assert signer[key] == transfer[key], key

assert signer["transfer_void_amount"] == "200"
assert signer["reserved_void_amount"] == "200"
assert signer["inventory_remaining_after"] == "0"
assert signer["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

dest = signer["destination_binding"]
assert dest["status"] == "withheld_private_operator_only"
assert dest["wallet_address_present"] is False
assert dest["wallet_secret_present"] is False
assert dest["private_key_present"] is False
assert dest["seed_phrase_present"] is False

binding = signer["signer_binding"]
assert binding["status"] == "withheld_private_operator_only"
assert binding["signer_authorization_shaped"] is True
assert binding["signer_access_granted"] is False
assert binding["signer_key_present"] is False
assert binding["wallet_secret_present"] is False
assert binding["private_key_present"] is False
assert binding["seed_phrase_present"] is False

assert signer["authorization"]["signer_authorization_shaped"] is True
assert signer["authorization"]["authorized_next_lane"] == "separate_operator_execute_hold"
assert signer["authorization"]["authorization_scope"] == "signer_authorization_shape_only_no_key_access_no_signing"
assert signer["authorization"]["requires_separate_operator_execute"] is True
assert signer["authorization"]["requires_separate_fulfillment_record"] is True
assert signer["authorization"]["requires_separate_allocation_claim"] is True

assert hold["authorization"]["signer_authorization_shaped"] is False
assert hold["authorization"]["authorized_next_lane"] is None
assert hold["authorization"]["requires_separate_operator_execute"] is True
assert hold["authorization"]["requires_separate_fulfillment_record"] is True
assert hold["authorization"]["requires_separate_allocation_claim"] is True

auth = signer["authority"]
assert auth["signer_authorization_recording_only"] is True
assert auth["signer_authorization_creation_now"] is True
for key in [
    "transfer_instruction_creation_now",
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
    if key == "signer_authorization_recording_only":
        assert value is True
    else:
        assert value is False, key

assert signer["next_required_lane"] == "separate_operator_execute_hold"

print("automatic_payment_canary_separate_signer_authorization_hold_transfer_instruction_binding_green=true")
print("automatic_payment_canary_separate_signer_authorization_hold_signer_state_green=true")
print("automatic_payment_canary_separate_signer_authorization_hold_hold_state_green=true")
print("automatic_payment_canary_separate_signer_authorization_hold_authority_boundary_green=true")
print("allocation_record_hash=" + signer["allocation_record_hash"])
PY

echo
echo "== source transfer instruction proof remains green =="
bash "$transfer_proof"
echo "automatic_payment_canary_separate_signer_authorization_hold_source_transfer_instruction_green=true"

echo
echo "== live-path signer authorization hold remains green =="
bash "$live_path_proof"
echo "automatic_payment_canary_separate_signer_authorization_hold_live_path_hold_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$signer_fixture" "$hold_fixture" >/tmp/void-canary-separate-signer-authorization-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-signer-authorization-hold-secret.out
  echo "automatic_payment_canary_separate_signer_authorization_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_signer_authorization_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-signer-authorization-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-signer-authorization-hold-doc-hex.out
  echo "automatic_payment_canary_separate_signer_authorization_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_signer_authorization_hold_doc_raw_key_like_hex_absent=true"
fi

python3 - "$signer_fixture" "$hold_fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

signer = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert signer["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert signer["destination_binding"]["wallet_address_present"] is False
assert signer["destination_binding"]["wallet_secret_present"] is False
assert signer["destination_binding"]["private_key_present"] is False
assert signer["destination_binding"]["seed_phrase_present"] is False
assert signer["signer_binding"]["signer_access_granted"] is False
assert signer["signer_binding"]["signer_key_present"] is False
assert signer["signer_binding"]["private_key_present"] is False
assert signer["signer_binding"]["seed_phrase_present"] is False
assert "canonical_payment_identity" not in hold or hold.get("canonical_payment_identity") is None
print("automatic_payment_canary_separate_signer_authorization_hold_placeholder_identity_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_signer_authorization_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_signer_authorization_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_signer_authorization_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_signer_authorization_hold_no_execution=true"
echo "automatic_payment_canary_separate_signer_authorization_hold_no_signing=true"
echo "automatic_payment_canary_separate_signer_authorization_hold_no_transfer=true"
echo "automatic_payment_canary_separate_signer_authorization_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_signer_authorization_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_SIGNER_AUTHORIZATION_HOLD_V1_GREEN"
