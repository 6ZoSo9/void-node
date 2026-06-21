#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-post-execution-settlement-record-v1.sh"
ledger="${VOID_WC_TO_VOID_SETTLEMENT_LEDGER:-ops/private/wc-to-void-settlements.jsonl}"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1' "$script" >/dev/null
grep -F '0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717' "$script" >/dev/null
grep -F '1000000000000000000' "$script" >/dev/null
grep -F 'dffe1949d232f54161e6facdac629631725dcf4d144e0c3a3147319fcac8a5fb' "$script" >/dev/null
grep -F 'b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9' "$script" >/dev/null
grep -F '70f6d039f51576ee4cf0c5686bb639806323c545da233533693f83ea501c2eb6' "$script" >/dev/null
grep -F 'private_key_seen_by_chat_or_repo' "$script" >/dev/null
grep -F 'plaintext_recipient_address_written_to_repo' "$script" >/dev/null

if grep -E 'PRIVATE_KEY=|MNEMONIC=|seed phrase' "$script" >/dev/null; then
  echo "forbidden private key material reference found" >&2
  exit 1
fi

tmp_ledger="/tmp/void-wc-to-void-post-execution-settlement-record-v1-ledger.jsonl"
rm -f "$tmp_ledger"

VOID_WC_TO_VOID_SETTLEMENT_LEDGER="$tmp_ledger" \
VOID_WC_TO_VOID_TX_HASH="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717" \
VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_OUT="/tmp/void-wc-to-void-post-execution-settlement-record-v1-proof.json" \
  "$script" >/tmp/void-wc-to-void-post-execution-settlement-record-v1-proof.log

grep -F 'VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_GREEN' /tmp/void-wc-to-void-post-execution-settlement-record-v1-proof.log >/dev/null

python3 - <<'PY'
import json
from pathlib import Path

j=json.load(open("/tmp/void-wc-to-void-post-execution-settlement-record-v1-proof.json"))
assert j["marker"] == "VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1"
assert j["settlement_record_written"] is True
assert j["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert j["chain_id"] == "2050"
assert j["receipt_status_success"] is True
assert j["value_wei"] == "1000000000000000000"
assert j["value_void"] == "1.000000"
assert j["from_address_sha256"] == "dffe1949d232f54161e6facdac629631725dcf4d144e0c3a3147319fcac8a5fb"
assert j["recipient_address_sha256"] == "b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
assert j["recipient_onchain_address_sha256"] == "70f6d039f51576ee4cf0c5686bb639806323c545da233533693f83ea501c2eb6"
assert j["duplicate_guard"]["duplicate_found"] is False
assert j["privacy"]["private_key_seen_by_chat_or_repo"] is False
assert j["privacy"]["seed_phrase_seen_by_chat_or_repo"] is False
assert j["privacy"]["plaintext_from_address_written_to_repo"] is False
assert j["privacy"]["plaintext_recipient_address_written_to_repo"] is False
assert j["post_execution_state"]["money_movement_performed"] is True
assert j["post_execution_state"]["wc_to_void_settlement_complete"] is True

lines=Path("/tmp/void-wc-to-void-post-execution-settlement-record-v1-ledger.jsonl").read_text().splitlines()
assert len(lines) == 1
row=json.loads(lines[0])
assert row["settlement_record_key"] == j["settlement_record_key"]
print("VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_JSON_ASSERT_GREEN")
PY

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-post-execution-settlement-record-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-post-execution-settlement-record-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-post-execution-settlement-record-mutation.out >/dev/null

echo "VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_PROOF_GREEN"
