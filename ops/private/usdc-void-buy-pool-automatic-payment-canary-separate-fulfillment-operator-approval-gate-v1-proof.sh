#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_OPERATOR_APPROVAL_GATE_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-operator-approval-gate-v1"
doc="docs/private/$n.md"
approve_fixture="fixtures/private/$n-approve.example.json"
hold_fixture="fixtures/private/$n-hold.example.json"
packet_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-packet-hold-v1.json"
packet_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-packet-hold-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_OPERATOR_APPROVAL_GATE_V1"

test -f "$doc"
test -f "$approve_fixture"
test -f "$hold_fixture"
test -f "$packet_fixture"
test -x "$packet_proof"
python3 -m json.tool "$approve_fixture" >/tmp/void-canary-separate-fulfillment-operator-approval-gate-v1-approve.pretty.json
python3 -m json.tool "$hold_fixture" >/tmp/void-canary-separate-fulfillment-operator-approval-gate-v1-hold.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$approve_fixture" >/dev/null
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
echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_files_exist=true"
echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_marker_green=true"

python3 - "$approve_fixture" "$hold_fixture" "$packet_fixture" <<'PY'
import json
import sys
from pathlib import Path

approve = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
packet = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_OPERATOR_APPROVAL_GATE_V1"
assert approve["marker"] == marker
assert hold["marker"] == marker
assert approve["state"] == "approved_for_separate_fulfillment_execution_authorization_lane"
assert hold["state"] == "held_pending_operator_approval"

assert approve["source_packet_marker"] == packet["marker"]
assert hold["source_packet_marker"] == packet["marker"]
assert approve["source_preflight_marker"] == packet["source_preflight_marker"]
assert approve["source_closeout_marker"] == packet["source_closeout_marker"]

for key in [
    "fulfillment_packet_id",
    "allocation_record_id",
    "packet_id",
    "canonical_payment_identity",
    "reserved_void_amount",
    "fulfillment_void_amount",
    "inventory_remaining_after",
    "allocation_record_hash",
]:
    assert approve[key] == packet[key], key

assert approve["fulfillment_void_amount"] == "200"
assert approve["reserved_void_amount"] == "200"
assert approve["inventory_remaining_after"] == "0"
assert approve["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

dest = approve["destination_binding"]
assert dest["status"] == "withheld_private_operator_only"
assert dest["wallet_address_present"] is False
assert dest["wallet_secret_present"] is False
assert dest["private_key_present"] is False
assert dest["seed_phrase_present"] is False

assert approve["approval"]["operator_approved"] is True
assert approve["approval"]["approved_next_lane"] == "separate_fulfillment_execution_authorization_lane"
assert approve["approval"]["approval_scope"] == "packet_shape_only_not_execution"
assert approve["approval"]["requires_separate_execution_authorization"] is True

assert hold["approval"]["operator_approved"] is False
assert hold["approval"]["approved_next_lane"] is None
assert hold["approval"]["requires_separate_execution_authorization"] is True

approve_auth = approve["authority"]
assert approve_auth["operator_approval_recording_only"] is True
assert approve_auth["operator_approval_now"] is True
for key in [
    "execution_authorization_now",
    "fulfillment_execution",
    "fulfillment_record_creation",
    "allocation_claim_creation",
    "transfer_instruction_creation",
    "signer_authorization_creation",
    "signer_access",
    "wallet_signing",
    "void_transfer",
    "transaction_broadcast",
    "public_mutation",
    "public_buyer_execution",
    "money_movement_now",
]:
    assert approve_auth[key] is False, key

for key, value in hold["authority"].items():
    if key == "operator_approval_recording_only":
        assert value is True
    else:
        assert value is False, key

assert approve["next_required_lane"] == "separate_fulfillment_execution_authorization_lane"

print("automatic_payment_canary_separate_fulfillment_operator_approval_gate_packet_binding_green=true")
print("automatic_payment_canary_separate_fulfillment_operator_approval_gate_approve_state_green=true")
print("automatic_payment_canary_separate_fulfillment_operator_approval_gate_hold_state_green=true")
print("automatic_payment_canary_separate_fulfillment_operator_approval_gate_authority_boundary_green=true")
print("allocation_record_hash=" + approve["allocation_record_hash"])
PY

echo
echo "== source packet proof remains green =="
bash "$packet_proof"
echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_source_packet_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$approve_fixture" "$hold_fixture" >/tmp/void-canary-separate-fulfillment-operator-approval-gate-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-operator-approval-gate-secret.out
  echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-fulfillment-operator-approval-gate-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-operator-approval-gate-doc-hex.out
  echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_doc_raw_key_like_hex_absent=true"
fi

python3 - "$approve_fixture" "$hold_fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

approve = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
hold = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert approve["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert approve["destination_binding"]["wallet_address_present"] is False
assert approve["destination_binding"]["wallet_secret_present"] is False
assert approve["destination_binding"]["private_key_present"] is False
assert approve["destination_binding"]["seed_phrase_present"] is False
assert "canonical_payment_identity" not in hold or hold.get("canonical_payment_identity") is None
print("automatic_payment_canary_separate_fulfillment_operator_approval_gate_placeholder_identity_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_no_execution=true"
echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_no_signing=true"
echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_no_transfer=true"
echo "automatic_payment_canary_separate_fulfillment_operator_approval_gate_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_OPERATOR_APPROVAL_GATE_V1_GREEN"
