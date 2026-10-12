#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_PACKET_HOLD_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-packet-hold-v1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"
ledger="ops/private/usdc-void-buy-pool-allocation-reservations.jsonl"
preflight_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-lane-preflight-v1.json"
preflight_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-lane-preflight-v1-proof.sh"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_PACKET_HOLD_V1"

test -f "$doc"
test -f "$fixture"
test -f "$ledger"
test -f "$preflight_fixture"
test -x "$preflight_proof"
python3 -m json.tool "$fixture" >/tmp/void-canary-separate-fulfillment-packet-hold-v1.pretty.json

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$fixture" >/dev/null
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
echo "automatic_payment_canary_separate_fulfillment_packet_hold_files_exist=true"
echo "automatic_payment_canary_separate_fulfillment_packet_hold_marker_green=true"

python3 - "$ledger" "$fixture" "$preflight_fixture" <<'PY'
import json
import sys
from pathlib import Path

ledger = Path(sys.argv[1])
fixture = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
preflight = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8"))

lines = [ln for ln in ledger.read_text(encoding="utf-8").splitlines() if ln.strip()]
assert len(lines) == 1
row = json.loads(lines[0])

assert fixture["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_PACKET_HOLD_V1"
assert fixture["state"] == "separate_fulfillment_packet_held_pending_operator_approval_gate"
assert fixture["source_preflight_marker"] == preflight["marker"]
assert preflight["state"] == "separate_fulfillment_lane_preflight_green_pending_packet_hold"
assert fixture["source_closeout_marker"] == preflight["source_closeout_marker"]
assert fixture["ledger_line_count"] == 1

for key in [
    "allocation_record_id",
    "packet_id",
    "canonical_payment_identity",
    "reserved_void_amount",
    "inventory_remaining_before",
    "inventory_remaining_after",
    "previous_allocation_record_hash",
    "allocation_record_hash",
]:
    assert fixture[key] == row[key], key
    assert fixture[key] == preflight[key], key

assert fixture["fulfillment_void_amount"] == fixture["reserved_void_amount"]
assert fixture["fulfillment_void_amount"] == "200"
assert row["inventory_remaining_after"] == "0"
assert row["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

dest = fixture["destination_binding"]
assert dest["status"] == "withheld_private_operator_only"
assert dest["wallet_address_present"] is False
assert dest["wallet_secret_present"] is False
assert dest["private_key_present"] is False
assert dest["seed_phrase_present"] is False

for field in [
    "fulfillment_packet_id",
    "allocation_record_id",
    "allocation_record_hash",
    "canonical_payment_identity",
    "fulfillment_void_amount",
    "destination_binding_status",
    "operator_approval_required",
]:
    assert field in fixture["packet_fields"], field

auth = fixture["authority"]
assert auth["packet_hold_recording_only"] is True
assert auth["operator_approval_required"] is True
for key in [
    "operator_approval_now",
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
    assert auth[key] is False, key

for reject in [
    "packet_without_preflight",
    "packet_without_closed_private_allocation_ledger_row",
    "packet_with_wallet_address",
    "packet_with_wallet_secret",
    "packet_with_private_key",
    "packet_with_seed_phrase",
    "packet_with_signer_authorization",
    "packet_with_wallet_signing",
    "packet_with_void_transfer",
    "packet_with_transaction_broadcast",
    "packet_with_public_mutation",
    "packet_marked_fulfilled",
]:
    assert reject in fixture["rejected_states"], reject

for key in [
    "fulfillment_execution",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
    "money_movement_now",
]:
    assert row["safety"][key] is False, key

assert fixture["next_required_lane"] == "separate_fulfillment_operator_approval_gate"

print("automatic_payment_canary_separate_fulfillment_packet_hold_row_match_green=true")
print("automatic_payment_canary_separate_fulfillment_packet_hold_preflight_binding_green=true")
print("automatic_payment_canary_separate_fulfillment_packet_hold_authority_false_green=true")
print("allocation_record_hash=" + row["allocation_record_hash"])
PY

echo
echo "== source preflight proof remains green =="
bash "$preflight_proof"
echo "automatic_payment_canary_separate_fulfillment_packet_hold_source_preflight_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$fixture" >/tmp/void-canary-separate-fulfillment-packet-hold-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-packet-hold-secret.out
  echo "automatic_payment_canary_separate_fulfillment_packet_hold_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_packet_hold_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-fulfillment-packet-hold-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-packet-hold-doc-hex.out
  echo "automatic_payment_canary_separate_fulfillment_packet_hold_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_packet_hold_doc_raw_key_like_hex_absent=true"
fi

python3 - "$fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

fixture = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert fixture["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert fixture["canonical_payment_identity"].startswith("8453:")
assert fixture["canonical_payment_identity"].endswith(":0")
assert fixture["destination_binding"]["wallet_address_present"] is False
print("automatic_payment_canary_separate_fulfillment_packet_hold_placeholder_identity_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_fulfillment_packet_hold_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_packet_hold_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_fulfillment_packet_hold_no_execution=true"
echo "automatic_payment_canary_separate_fulfillment_packet_hold_no_signing=true"
echo "automatic_payment_canary_separate_fulfillment_packet_hold_no_transfer=true"
echo "automatic_payment_canary_separate_fulfillment_packet_hold_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_PACKET_HOLD_V1_GREEN"
