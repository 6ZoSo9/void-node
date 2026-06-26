#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_POST_WRITE_CLOSEOUT_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-post-write-closeout-v1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"
ledger="ops/private/usdc-void-buy-pool-allocation-reservations.jsonl"
actual_n="usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-actual-execute-v1"
proof="ops/private/$n-proof.sh"

test -f "$doc"
test -f "$fixture"
test -f "$ledger"
python3 -m json.tool "$fixture" >/tmp/void-private-allocation-ledger-write-post-write-closeout-v1.pretty.json

grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_POST_WRITE_CLOSEOUT_V1' "$doc"
grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_POST_WRITE_CLOSEOUT_V1' "$fixture"
grep -q 'does not append another ledger row' "$doc"
grep -q 'does not execute fulfillment' "$doc"
grep -q 'does not sign a wallet transaction' "$doc"
grep -q 'does not transfer VOID' "$doc"
grep -q 'does not create a public mutation route' "$doc"
echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_files_exist=true"
echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_marker_green=true"

python3 - "$ledger" "$fixture" <<'PY'
import json
from pathlib import Path
import sys

ledger = Path(sys.argv[1])
fixture = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))

lines = [ln for ln in ledger.read_text(encoding="utf-8").splitlines() if ln.strip()]
assert len(lines) == 1
row = json.loads(lines[0])

assert fixture["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_POST_WRITE_CLOSEOUT_V1"
assert fixture["state"] == "private_allocation_ledger_write_closed_pending_separate_fulfillment_lane"
assert fixture["ledger_line_count"] == 1
assert fixture["ledger_entry_line"] == 1

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

assert row["schema"] == "void_usdc_void_buy_pool_private_allocation_ledger_record_v1"
assert row["record_type"] == "usdc_void_buy_pool_private_allocation_reservation"
assert row["lane"] == "automatic_payment_canary_private_allocation_ledger_write_actual_execute_v1"
assert row["reserved_void_amount"] == "200"
assert row["inventory_remaining_before"] == "200"
assert row["inventory_remaining_after"] == "0"
assert row["previous_allocation_record_hash"] == "GENESIS_VOID_PRIVATE_ALLOCATION_LEDGER_V1"
assert row["allocation_record_hash"] == "4e2ff91a25e4a596a23a6dde645091be1c5209a6d9dcee1cbf35e0cff18d9fa1"

auth = fixture["authority"]
assert auth["private_allocation_ledger_write_completed"] is True
assert auth["private_allocation_ledger_write_now"] is False
assert auth["private_allocation_ledger_mutation_now"] is False
assert auth["additional_ledger_append_now"] is False
assert auth["fulfillment_execution"] is False
assert auth["wallet_signing"] is False
assert auth["void_transfer"] is False
assert auth["public_mutation"] is False
assert auth["public_buyer_execution"] is False
assert auth["money_movement_now"] is False
assert fixture["next_required_lane"] == "separate_fulfillment_lane"

assert row["safety"]["private_allocation_ledger_write_now"] is True
assert row["safety"]["private_allocation_ledger_mutation"] is True
assert row["safety"]["fulfillment_execution"] is False
assert row["safety"]["wallet_signing"] is False
assert row["safety"]["void_transfer"] is False
assert row["safety"]["public_mutation"] is False
assert row["safety"]["public_buyer_execution"] is False
assert row["safety"]["money_movement_now"] is False

print("automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_row_match_green=true")
print("allocation_record_hash=" + row["allocation_record_hash"])
PY

echo
echo "== duplicate refusal remains green, no append =="
if VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE=1 \
VOID_PRIVATE_ALLOCATION_LEDGER_PATH="$ledger" \
VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_OUT="/tmp/void-private-allocation-ledger-write-post-write-closeout-duplicate-output.json" \
bash "ops/private/$actual_n.sh" >/tmp/void-private-allocation-ledger-write-post-write-closeout-duplicate.out 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_duplicate_unexpected_pass=true"
  exit 1
else
  grep -q 'REFUSED_DUPLICATE' /tmp/void-private-allocation-ledger-write-post-write-closeout-duplicate.out
  echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_duplicate_refusal_green=true"
fi

bash "ops/private/$actual_n-proof.sh"

grep -RInE 'PRIVATE_KEY=|MNEMONIC=|SEED=' "$doc" "$fixture" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_secret_assignment_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_secret_assignment_leak_absent=true"

grep -RInE '0x[a-fA-F0-9]{64}' "$doc" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_doc_raw_key_like_hex_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_doc_raw_key_like_hex_absent=true"

python3 - "$fixture" <<'PYFIXTURE'
import json
import sys
from pathlib import Path

fixture = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert fixture["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert fixture["canonical_payment_identity"].startswith("8453:")
assert fixture["canonical_payment_identity"].endswith(":0")
print("automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_canonical_payment_identity_placeholder_green=true")
PYFIXTURE

if grep -RIn 'usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-post-write-closeout-v1' src public docs/public fixtures/public ops/mainnet0 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_public_leak_found=true"
  exit 1
else
  echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_public_leak_absent=true"
fi

echo "automatic_payment_canary_private_allocation_ledger_write_post_write_closeout_no_new_mutation=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_POST_WRITE_CLOSEOUT_V1_GREEN"
