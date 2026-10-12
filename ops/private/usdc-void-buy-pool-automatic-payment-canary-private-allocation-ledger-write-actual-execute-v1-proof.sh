#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_PROOF_BEGIN"

n="usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-actual-execute-v1"
doc="docs/private/$n.md"
script="ops/private/$n.sh"

test -f "$doc"
test -x "$script"
bash -n "$script"

grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1' "$doc"
grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1' "$script"
grep -q 'VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE=1' "$doc"
grep -q 'VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE' "$script"
echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_files_exist=true"
echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_marker_green=true"

if VOID_PRIVATE_ALLOCATION_LEDGER_PATH="/tmp/void-proof-should-not-write.jsonl" "$script" >/tmp/void-ledger-write-actual-execute-locked.out 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_locked_unexpected_pass=true"
  exit 1
else
  grep -q 'REFUSED_LOCKED' /tmp/void-ledger-write-actual-execute-locked.out
  echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_locked_refusal_green=true"
fi

tmp_ledger="/tmp/void-canary-private-allocation-ledger-write-actual-execute-v1-proof-ledger.jsonl"
tmp_out="/tmp/void-canary-private-allocation-ledger-write-actual-execute-v1-proof-output.json"
rm -f "$tmp_ledger" "$tmp_out"

VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE=1 \
VOID_PRIVATE_ALLOCATION_LEDGER_PATH="$tmp_ledger" \
VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_OUT="$tmp_out" \
"$script" >/tmp/void-ledger-write-actual-execute-proof-run.out

grep -q 'VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_GREEN' /tmp/void-ledger-write-actual-execute-proof-run.out

python3 - "$tmp_ledger" "$tmp_out" <<'PY'
import json
import sys
from pathlib import Path

ledger = Path(sys.argv[1])
out = Path(sys.argv[2])
result = json.loads(out.read_text(encoding="utf-8"))
lines = [ln for ln in ledger.read_text(encoding="utf-8").splitlines() if ln.strip()]
rows = [json.loads(ln) for ln in lines]

assert result["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1"
assert result["ok"] is True
assert result["state"] == "private_allocation_ledger_record_appended"
assert result["ledger_before_lines"] == 0
assert result["ledger_after_lines"] == 1
assert result["ledger_entry_written_now"] is True
assert result["private_allocation_ledger_write_now"] is True
assert result["private_allocation_ledger_mutation"] is True
assert result["fulfillment_execution"] is False
assert result["wallet_signing"] is False
assert result["void_transfer"] is False
assert result["public_mutation"] is False
assert result["public_buyer_execution"] is False
assert result["money_movement_now"] is False

assert len(rows) == 1
row = rows[0]
assert row["schema"] == "void_usdc_void_buy_pool_private_allocation_ledger_record_v1"
assert row["record_type"] == "usdc_void_buy_pool_private_allocation_reservation"
assert row["allocation_record_id"] == result["allocation_record_id"]
assert row["packet_id"] == result["packet_id"]
assert row["canonical_payment_identity"] == result["canonical_payment_identity"]
assert row["reserved_void_amount"] == "200"
assert row["inventory_remaining_before"] == "200"
assert row["inventory_remaining_after"] == "0"
assert row["previous_allocation_record_hash"] == "GENESIS_VOID_PRIVATE_ALLOCATION_LEDGER_V1"
assert row["allocation_record_hash"] == result["allocation_record_hash"]
assert row["safety"]["fulfillment_execution"] is False
assert row["safety"]["wallet_signing"] is False
assert row["safety"]["void_transfer"] is False
assert row["safety"]["public_mutation"] is False
assert row["safety"]["public_buyer_execution"] is False

print("automatic_payment_canary_private_allocation_ledger_write_actual_execute_semantics_green=true")
PY

if VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE=1 \
VOID_PRIVATE_ALLOCATION_LEDGER_PATH="$tmp_ledger" \
VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_OUT="/tmp/void-canary-private-allocation-ledger-write-actual-execute-v1-duplicate-output.json" \
"$script" >/tmp/void-ledger-write-actual-execute-duplicate.out 2>/dev/null; then
  echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_duplicate_unexpected_pass=true"
  exit 1
else
  grep -q 'REFUSED_DUPLICATE' /tmp/void-ledger-write-actual-execute-duplicate.out
  echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_duplicate_refusal_green=true"
fi

grep -RInE 'PRIVATE_KEY|MNEMONIC|SEED' "$doc" "$script" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_secret_word_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_secret_word_leak_absent=true"

grep -RInE '0x[a-fA-F0-9]{64}' "$doc" "$script" && {
  echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_raw_key_like_hex_found=true"
  exit 1
} || echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_raw_key_like_hex_absent=true"

echo "automatic_payment_canary_private_allocation_ledger_write_actual_execute_secret_leak_absent=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_GREEN"
