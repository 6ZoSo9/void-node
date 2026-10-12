#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
from pathlib import Path

src = Path("src/index.ts").read_text()
receipt_path = Path("docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json")
receipt = json.loads(receipt_path.read_text())

assert receipt["marker"] == "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1"
assert receipt["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert str(receipt["chain_id"]) == "2050"
assert receipt["value_void"] == "1.000000"
assert receipt["value_wei"] == "1000000000000000000"
assert receipt["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"
assert receipt["money_movement_performed"] is True
assert receipt["receipt_status_success"] is True
assert receipt["wc_to_void_settlement_complete"] is True
assert receipt["public_receipt"] is True

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
assert receipt["closed_boundaries"]["does_not_create_public_mutation"] is True

blob = json.dumps(receipt, sort_keys=True).lower()
assert "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" not in blob
assert "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5" not in blob

assert "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1" in src
assert "wcToVoidRedactedSettlementReceiptV1" in src
assert "__void_wc_to_void_redacted_settlement_receipt_runtime_v1_mounted" in src
assert "mountWcToVoidRedactedSettlementReceiptRuntimeV1" in src
assert 'const APP: any = G.__void_http_app || G.app || null;' in src
assert 'setTimeout(mountWcToVoidRedactedSettlementReceiptRuntimeV1, 400);' in src

assert 'APP.get("/public-node/wc-to-void/redacted-settlement-receipt-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/redacted-settlement-receipt-v1"' in src
assert '\napp.get("/public-node/wc-to-void/redacted-settlement-receipt-v1' not in src

assert "return res.json(wcToVoidRedactedSettlementReceiptV1);" in src
assert "renderWcToVoidRedactedSettlementReceiptV1Html" in src
assert 'href="/public-node/wc-to-void/redacted-settlement-receipt-v1.json"' in src

print("VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1_JSON_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1_PROOF_GREEN"
