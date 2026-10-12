#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_EXECUTION_AUTHORIZATION_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-execution-authorization-hold-v1"
doc="docs/private/$n.md"
authorize_fixture="fixtures/private/$n-authorize.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
approval_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-operator-approval-gate-v1-approve.example.json"
approval_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-operator-approval-gate-v1-proof.sh"
live_path_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_EXECUTION_AUTHORIZATION_HOLD_V1"

test -f "$doc"
test -f "$authorize_fixture"
test -f "$hold_fixture"
test -f "$approval_fixture"
test -x "$approval_proof"
test -x "$live_path_proof"
python3 -m json.tool "$authorize_fixture" >/tmp/void-canary-separate-fulfillment-execution-authorization-hold-v1-authorize.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-separate-fulfillment-execution-authorization-hold-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$authorize_fixture" >/dev/null
grep -F "$marker" "$hold_fixture" >/dev/null
grep -F "does not execute fulfillment" "$doc" >/dev/null
grep -F "does not create a fulfillment record" "$doc" >/dev/null
grep -F "does not create an allocation claim" "$doc" >/dev/null
grep -F "does not create a transfer instruction" "$doc" >/dev/null
grep -F "does not authorize a signer" "$doc" >/dev/null
grep -F "does not expose wallet secrets" "$doc" >/dev/null
grep -F "does not expose a wallet address" "$doc" >/dev/null
grep -F "does not sign a wallet transaction" "$doc" >/dev/null
grep -F "does not transfer VOID" "$doc" >/dev/null
grep -F "does not broadcast a transaction" "$doc" >/dev/null
grep -F "does not create a public mutation route" "$doc" >/dev/null
grep -F "does not authorize buyer execution" "$doc" >/dev/null
grep -F "does not perform money movement" "$doc" >/dev/null
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_files_exist=true"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_marker_green=true"

python3 - "$authorize_fixture" "$hold_fixture" "$approval_fixture" <<'PY'
import json
import sys
from pathlib import Path

authorize = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
approval = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_EXECUTION_AUTHORIZATION_HOLD_V1"
assert authorize["marker"] == marker
assert hold["marker"] == marker
assert authorize["state"] == "authorized_for_separate_transfer_instruction_lane"
assert hold["state"] == "held_pending_execution_authorization"

assert authorize["source_operator_approval_marker"] == approval["marker"]
assert hold["source_operator_approval_marker"] == approval["marker"]
assert approval["state"] == "approved_for_separate_fulfillment_execution_authorization_lane"
assert authorize["source_packet_marker"] == approval["source_packet_marker"]
assert authorize["source_preflight_marker"] == approval["source_preflight_marker"]
assert authorize["source_closeout_marker"] == approval["source_closeout_marker"]

for key in [
    "operator_approval_id",
    "fulfillment_packet_id",
    "allocation_record_id",
    "packet_id",
    "canonical_payment_identity",
    "reserved_void_amount",
    "fulfillment_void_amount",
    "inventory_remaining_after",
    "allocation_record_hash",
]:
    assert authorize[key] == approval[key], key

assert authorize["fulfillment_void_amount"] == "200"
assert authorize["reserved_void_amount"] == "200"
assert authorize["inventory_remaining_after"] == "0"
assert authorize["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

dest = authorize["destination_binding"]
assert dest["status"] == "withheld_private_operator_only"
assert dest["wallet_address_present"] is False
assert dest["wallet_secret_present"] is False
assert dest["private_key_present"] is False
assert dest["seed_phrase_present"] is False

assert authorize["authorization"]["execution_authorized"] is True
assert authorize["authorization"]["authorized_next_lane"] == "separate_transfer_instruction_hold"
assert authorize["authorization"]["authorization_scope"] == "transfer_instruction_lane_only_not_execution"
assert authorize["authorization"]["requires_separate_transfer_instruction"] is True
assert authorize["authorization"]["requires_separate_signer_authorization"] is True
assert authorize["authorization"]["requires_separate_operator_execute"] is True

assert hold["authorization"]["execution_authorized"] is False
assert hold["authorization"]["authorized_next_lane"] is None
assert hold["authorization"]["requires_separate_transfer_instruction"] is True
assert hold["authorization"]["requires_separate_signer_authorization"] is True
assert hold["authorization"]["requires_separate_operator_execute"] is True

auth = authorize["authority"]
assert auth["execution_authorization_recording_only"] is True
assert auth["execution_authorization_now"] is True
for key in [
    "transfer_instruction_creation_now",
    "signer_authorization_creation",
    "signer_access",
    "wallet_signing",
    "void_transfer",
    "transaction_broadcast",
    "fulfillment_execution",
    "fulfillment_record_creation",
    "allocation_claim_creation",
    "public_mutation",
    "public_buyer_execution",
    "money_movement_now",
]:
    assert auth[key] is False, key

for key, value in hold["authority"].items():
    if key == "execution_authorization_recording_only":
        assert value is True
    else:
        assert value is False, key

assert authorize["next_required_lane"] == "separate_transfer_instruction_hold"

print("automatic_payment_canary_separate_fulfillment_execution_authorization_hold_operator_approval_binding_green=true")
print("automatic_payment_canary_separate_fulfillment_execution_authorization_hold_authorized_state_green=true")
print("automatic_payment_canary_separate_fulfillment_execution_authorization_hold_hold_state_green=true")
print("automatic_payment_canary_separate_fulfillment_execution_authorization_hold_authority_boundary_green=true")
print("allocation_record_hash=" + authorize["allocation_record_hash"])
PY

echo
echo "== source operator approval proof remains green =="
bash "$approval_proof"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_source_operator_approval_green=true"

echo
echo "== live-path execution authorization hold remains green =="
bash "$live_path_proof"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_live_path_hold_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$authorize_fixture" "$hold_fixture" >/tmp/void-canary-separate-fulfillment-execution-authorization-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-execution-authorization-hold-secret.out
  echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-fulfillment-execution-authorization-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-execution-authorization-hold-doc-hex.out
  echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_doc_raw_key_like_hex_absent=true"
fi

python3 - "$authorize_fixture" "$hold_fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

authorize = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert authorize["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert authorize["destination_binding"]["wallet_address_present"] is False
assert authorize["destination_binding"]["wallet_secret_present"] is False
assert authorize["destination_binding"]["private_key_present"] is False
assert authorize["destination_binding"]["seed_phrase_present"] is False
assert "canonical_payment_identity" not in hold or hold.get("canonical_payment_identity") is None
print("automatic_payment_canary_separate_fulfillment_execution_authorization_hold_placeholder_identity_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_no_transfer_instruction_creation=true"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_no_execution=true"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_no_signing=true"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_no_transfer=true"
echo "automatic_payment_canary_separate_fulfillment_execution_authorization_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_EXECUTION_AUTHORIZATION_HOLD_V1_GREEN"
