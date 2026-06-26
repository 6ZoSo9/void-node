#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_LANE_PREFLIGHT_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-separate-fulfillment-lane-preflight-v1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"
ledger="ops/private/usdc-void-buy-pool-allocation-reservations.jsonl"
closeout_proof="ops/private/usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-post-write-closeout-v1-proof.sh"

test -f "$doc"
test -f "$fixture"
test -f "$ledger"
test -x "$closeout_proof"
python3 -m json.tool "$fixture" >/tmp/void-canary-separate-fulfillment-lane-preflight-v1.pretty.json

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_LANE_PREFLIGHT_V1"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$fixture" >/dev/null
grep -F "does not execute fulfillment" "$doc" >/dev/null
grep -F "does not create a fulfillment record" "$doc" >/dev/null
grep -F "does not create an allocation claim" "$doc" >/dev/null
grep -F "does not create a transfer instruction" "$doc" >/dev/null
grep -F "does not authorize a signer" "$doc" >/dev/null
grep -F "does not sign a wallet transaction" "$doc" >/dev/null
grep -F "does not transfer VOID" "$doc" >/dev/null
grep -F "does not broadcast a transaction" "$doc" >/dev/null
grep -F "does not create a public mutation route" "$doc" >/dev/null
grep -F "does not authorize buyer execution" "$doc" >/dev/null
grep -F "does not perform money movement" "$doc" >/dev/null
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_files_exist=true"
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_marker_green=true"

python3 - "$ledger" "$fixture" <<'PY'
import json
import sys
from pathlib import Path

ledger = Path(sys.argv[1])
fixture = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))

lines = [ln for ln in ledger.read_text(encoding="utf-8").splitlines() if ln.strip()]
assert len(lines) == 1
row = json.loads(lines[0])

assert fixture["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_LANE_PREFLIGHT_V1"
assert fixture["state"] == "separate_fulfillment_lane_preflight_green_pending_packet_hold"
assert fixture["source_closeout_marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_POST_WRITE_CLOSEOUT_V1"
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

assert row["reserved_void_amount"] == "200"
assert row["inventory_remaining_before"] == "200"
assert row["inventory_remaining_after"] == "0"
assert row["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

required = set(fixture["required_live_path_holds"])
expected = {
    "fulfillment_wallet_policy_hold",
    "allocation_claim_creation_live_path_hold",
    "fulfillment_record_creation_live_path_hold",
    "fulfillment_execution_authorization_live_path_hold",
    "fulfillment_transfer_instruction_live_path_hold",
    "fulfillment_signer_authorization_live_path_hold",
}
assert required == expected

auth = fixture["authority"]
assert auth["preflight_recording_only"] is True
for key in [
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

for key in [
    "fulfillment_execution",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
    "money_movement_now",
]:
    assert row["safety"][key] is False, key

assert fixture["next_required_lane"] == "separate_fulfillment_packet_hold"

print("automatic_payment_canary_separate_fulfillment_lane_preflight_row_match_green=true")
print("automatic_payment_canary_separate_fulfillment_lane_preflight_authority_false_green=true")
print("allocation_record_hash=" + row["allocation_record_hash"])
PY

echo
echo "== required existing live-path hold proofs =="
for p in \
  ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1-proof.sh \
  ops/mainnet0/usdc-void-buy-pool-automatic-payment-allocation-claim-creation-live-path-hold-v1-proof.sh \
  ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-record-creation-live-path-hold-v1-proof.sh \
  ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1-proof.sh \
  ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-transfer-instruction-live-path-hold-v1-proof.sh \
  ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1-proof.sh
do
  test -x "$p"
  bash "$p"
done
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_required_live_path_holds_green=true"

echo
echo "== closeout proof remains green =="
bash "$closeout_proof"
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_source_closeout_green=true"

if grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$fixture" >/tmp/void-canary-separate-fulfillment-lane-preflight-secret.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-lane-preflight-secret.out
  echo "automatic_payment_canary_separate_fulfillment_lane_preflight_secret_assignment_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_lane_preflight_secret_assignment_leak_absent=true"
fi

if grep -RInE '0x[a-fA-F0-9]{64}' "$doc" >/tmp/void-canary-separate-fulfillment-lane-preflight-doc-hex.out 2>/dev/null; then
  cat /tmp/void-canary-separate-fulfillment-lane-preflight-doc-hex.out
  echo "automatic_payment_canary_separate_fulfillment_lane_preflight_doc_raw_key_like_hex_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_lane_preflight_doc_raw_key_like_hex_absent=true"
fi

python3 - "$fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

fixture = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert fixture["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert fixture["canonical_payment_identity"].startswith("8453:")
assert fixture["canonical_payment_identity"].endswith(":0")
print("automatic_payment_canary_separate_fulfillment_lane_preflight_canonical_payment_identity_placeholder_green=true")
PYFIXTURE

if grep -RIn "$marker" src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_separate_fulfillment_lane_preflight_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_separate_fulfillment_lane_preflight_public_leak_absent=true"
fi

echo "automatic_payment_canary_separate_fulfillment_lane_preflight_no_execution=true"
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_no_signing=true"
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_no_transfer=true"
echo "automatic_payment_canary_separate_fulfillment_lane_preflight_no_public_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_SEPARATE_FULFILLMENT_LANE_PREFLIGHT_V1_GREEN"
