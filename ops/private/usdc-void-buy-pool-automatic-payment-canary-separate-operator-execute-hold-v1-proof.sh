#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_OPERATOR_EXECUTE_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-operator-execute-hold-v1"
doc="docs/private/$n.md"
execute_fixture="fixtures/private/$n-execute.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
signer_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-signer-authorization-hold-v1-signer.example.json"
signer_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-signer-authorization-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_OPERATOR_EXECUTE_HOLD_V1"

test -f "$doc"
test -f "$execute_fixture"
test -f "$hold_fixture"
test -f "$signer_fixture"
test -x "$signer_proof"
python3 -m json.tool "$execute_fixture" >/tmp/void-canary-separate-operator-execute-hold-v1-execute.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-separate-operator-execute-hold-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$execute_fixture" >/dev/null
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
echo "automatic_payment_canary_separate_operator_execute_hold_files_exist=true"
echo "automatic_payment_canary_separate_operator_execute_hold_marker_green=true"

python3 - "$execute_fixture" "$hold_fixture" "$signer_fixture" <<'PY'
import json
import sys
from pathlib import Path

execute = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
signer = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_OPERATOR_EXECUTE_HOLD_V1"
assert execute["marker"] == marker
assert hold["marker"] == marker
assert execute["state"] == "operator_execute_packet_held_pending_actual_execute_gate"
assert hold["state"] == "held_pending_operator_execute_packet"

assert execute["source_signer_authorization_marker"] == signer["marker"]
assert hold["source_signer_authorization_marker"] == signer["marker"]
assert signer["state"] == "signer_authorization_held_pending_operator_execute_lane"
assert signer["next_required_lane"] == "separate_operator_execute_hold"
assert execute["source_transfer_instruction_marker"] == signer["source_transfer_instruction_marker"]
assert execute["source_execution_authorization_marker"] == signer["source_execution_authorization_marker"]
assert execute["source_operator_approval_marker"] == signer["source_operator_approval_marker"]
assert execute["source_packet_marker"] == signer["source_packet_marker"]
assert execute["source_preflight_marker"] == signer["source_preflight_marker"]
assert execute["source_closeout_marker"] == signer["source_closeout_marker"]

for key in [
    "signer_authorization_id",
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
    assert execute[key] == signer[key], key

assert execute["transfer_void_amount"] == "200"
assert execute["reserved_void_amount"] == "200"
assert execute["inventory_remaining_after"] == "0"
assert execute["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

for key in ["destination_binding", "signer_binding"]:
    binding = execute[key]
    assert binding["status"] == "withheld_private_operator_only"
    assert binding.get("wallet_secret_present", False) is False
    assert binding.get("private_key_present", False) is False
    assert binding.get("seed_phrase_present", False) is False

assert execute["destination_binding"]["wallet_address_present"] is False
assert execute["signer_binding"]["signer_access_granted"] is False
assert execute["signer_binding"]["signer_key_present"] is False

assert execute["operator_execute"]["operator_execute_packet_shaped"] is True
assert execute["operator_execute"]["operator_execute_scope"] == "execute_packet_shape_only_no_signer_access_no_signing_no_broadcast_no_transfer"
assert execute["operator_execute"]["requires_separate_actual_execute_gate"] is True
assert execute["operator_execute"]["requires_separate_fulfillment_record"] is True
assert execute["operator_execute"]["requires_separate_allocation_claim"] is True

assert hold["operator_execute"]["operator_execute_packet_shaped"] is False
assert hold["operator_execute"]["operator_execute_scope"] == "held_no_operator_execute_packet"

auth = execute["authority"]
assert auth["operator_execute_packet_recording_only"] is True
assert auth["operator_execute_packet_creation_now"] is True
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
    "money_movement_now",
]:
    assert auth[key] is False, key

for key, value in hold["authority"].items():
    if key == "operator_execute_packet_recording_only":
        assert value is True
    else:
        assert value is False, key

assert execute["next_required_lane"] == "separate_actual_execute_gate"

print("automatic_payment_canary_separate_operator_execute_hold_signer_authorization_binding_green=true")
print("automatic_payment_canary_separate_operator_execute_hold_execute_packet_state_green=true")
print("automatic_payment_canary_separate_operator_execute_hold_hold_state_green=true")
print("automatic_payment_canary_separate_operator_execute_hold_authority_boundary_green=true")
print("allocation_record_hash=" + execute["allocation_record_hash"])
PY

echo
echo "== source signer authorization proof remains green =="
bash "$signer_proof"
echo "automatic_payment_canary_separate_operator_execute_hold_source_signer_authorization_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$execute_fixture" "$hold_fixture" >/tmp/void-canary-separate-operator-execute-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-operator-execute-hold-secret.out
  echo "automatic_payment_canary_separate_operator_execute_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_operator_execute_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-operator-execute-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-operator-execute-hold-doc-hex.out
  echo "automatic_payment_canary_separate_operator_execute_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_operator_execute_hold_doc_raw_key_like_hex_absent=true"
fi

python3 - "$execute_fixture" "$hold_fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

execute = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert execute["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert execute["destination_binding"]["wallet_address_present"] is False
assert execute["destination_binding"]["wallet_secret_present"] is False
assert execute["destination_binding"]["private_key_present"] is False
assert execute["destination_binding"]["seed_phrase_present"] is False
assert execute["signer_binding"]["signer_access_granted"] is False
assert execute["signer_binding"]["signer_key_present"] is False
assert execute["signer_binding"]["private_key_present"] is False
assert execute["signer_binding"]["seed_phrase_present"] is False
assert "canonical_payment_identity" not in hold or hold.get("canonical_payment_identity") is None
print("automatic_payment_canary_separate_operator_execute_hold_placeholder_identity_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_operator_execute_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_operator_execute_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_operator_execute_hold_no_actual_execute_authorization=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_signer_access=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_execution=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_signing=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_transfer=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_broadcast=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_fulfilled_state=true"
echo "automatic_payment_canary_separate_operator_execute_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_OPERATOR_EXECUTE_HOLD_V1_GREEN"
