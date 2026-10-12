#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

json_file="docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json"
doc_file="docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.md"
ledger_file="ops/private/wc-to-void-settlements.jsonl"

test -f "$json_file"
test -f "$doc_file"
test -f "$ledger_file"

grep -F 'VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1' "$json_file" >/dev/null
grep -F 'VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1' "$doc_file" >/dev/null
grep -F '0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717' "$json_file" >/dev/null
grep -F '710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1' "$json_file" >/dev/null
grep -F 'buy_void_is_canonical_funding_route' "$json_file" >/dev/null

python3 - <<'PY'
import json
import re
from pathlib import Path

json_file = Path("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json")
doc_file = Path("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.md")
ledger_file = Path("ops/private/wc-to-void-settlements.jsonl")

receipt = json.loads(json_file.read_text())
lines = [ln for ln in ledger_file.read_text().splitlines() if ln.strip()]
assert len(lines) == 1
ledger = json.loads(lines[0])

assert receipt["marker"] == "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1"
assert receipt["public_receipt"] is True
assert receipt["chain_id"] == "2050"
assert receipt["tx_hash"] == ledger["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert receipt["value_void"] == ledger["value_void"] == "1.000000"
assert receipt["value_wei"] == ledger["value_wei"] == "1000000000000000000"
assert receipt["settlement_record_key"] == ledger["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"
assert receipt["receipt_status_success"] is True
assert receipt["money_movement_performed"] is True
assert receipt["wc_to_void_settlement_complete"] is True

assert receipt["approved_settlement"]["settlement_key"] == ledger["approved_settlement"]["settlement_key"]
assert receipt["approved_settlement"]["preview_sha256"] == ledger["approved_settlement"]["preview_sha256"]
assert receipt["approved_settlement"]["approval_record_sha256"] == ledger["approved_settlement"]["approval_record_sha256"]
assert receipt["approved_settlement"]["wc"] == "100"
assert receipt["approved_settlement"]["void"] == "1.000000"

assert receipt["execution_packets"]["manual_execute_packet_sha256"] == ledger["execution_packets"]["manual_execute_packet_sha256"]
assert receipt["execution_packets"]["terminal_execute_request_packet_sha256"] == ledger["execution_packets"]["terminal_execute_request_packet_sha256"]

assert receipt["redacted_party_hashes"]["from_address_sha256"] == ledger["from_address_sha256"]
assert receipt["redacted_party_hashes"]["recipient_declared_address_sha256"] == ledger["recipient_address_sha256"]
assert receipt["redacted_party_hashes"]["recipient_onchain_normalized_address_sha256"] == ledger["recipient_onchain_address_sha256"]

assert receipt["funding_route_alignment"]["buy_void_is_canonical_funding_route"] is True
assert receipt["funding_route_alignment"]["no_duplicate_funding_surface_added"] is True

assert receipt["privacy"]["plaintext_addresses_redacted"] is True
assert receipt["privacy"]["plaintext_from_address_written_to_public_receipt"] is False
assert receipt["privacy"]["plaintext_recipient_address_written_to_public_receipt"] is False
assert receipt["privacy"]["private_key_seen_by_chat_or_repo"] is False
assert receipt["privacy"]["seed_phrase_seen_by_chat_or_repo"] is False

assert receipt["closed_boundaries"]["read_only_public_receipt"] is True
assert receipt["closed_boundaries"]["does_not_execute_command"] is True
assert receipt["closed_boundaries"]["does_not_broadcast_tx"] is True
assert receipt["closed_boundaries"]["does_not_send_void"] is True
assert receipt["closed_boundaries"]["does_not_call_rpc"] is True
assert receipt["closed_boundaries"]["does_not_read_private_key"] is True
assert receipt["closed_boundaries"]["does_not_create_public_mutation"] is True

addr_re = re.compile(r"0x[a-fA-F0-9]{40}(?![a-fA-F0-9])")
for path in [json_file, doc_file, ledger_file]:
    text = path.read_text()
    assert not addr_re.search(text), f"plaintext EVM address found in {path}"

for path in [json_file, doc_file]:
    text = path.read_text()
    assert "PRIVATE_KEY=" not in text
    assert "MNEMONIC=" not in text
    assert "BEGIN PRIVATE KEY" not in text
    assert "seed phrase:" not in text.lower()

print("VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1_JSON_ASSERT_GREEN")
PY

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-redacted-settlement-receipt-v1-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-redacted-settlement-receipt-v1-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-redacted-settlement-receipt-v1-mutation.out >/dev/null

echo "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1_PROOF_GREEN"
