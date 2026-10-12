#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
from pathlib import Path

j = json.loads(Path("docs/public/public-node-wc-to-void-settlement-evidence-closeout-seal-v1.json").read_text())
md = Path("docs/public/public-node-wc-to-void-settlement-evidence-closeout-seal-v1.md").read_text()

assert j["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1"
assert j["scope"] == "first_wc_to_void_settlement_evidence_closeout"
assert j["status"] == "sealed"
assert j["chain_id"] == "2050"
assert j["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert j["value_void"] == "1.000000"
assert j["value_wei"] == "1000000000000000000"
assert j["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"

assert j["sealed_heads"]["evidence_pack_discovery_link_v1"] == "843f0680"
assert j["sealed_heads"]["settlement_evidence_pack_runtime_v1"] == "f268105d"
assert j["sealed_heads"]["settlement_evidence_pack_static_v1"] == "52f342a1"
assert j["sealed_heads"]["redacted_receipt_runtime_scope_fix_v1"] == "3cf694f7"

assert j["sealed_public_routes"]["redacted_receipt_json"] == "/public-node/wc-to-void/redacted-settlement-receipt-v1.json"
assert j["sealed_public_routes"]["evidence_pack_json"] == "/public-node/wc-to-void/settlement-evidence-pack-v1.json"
assert j["sealed_public_routes"]["route_index"] == "/public-node/route-index.json"
assert j["sealed_public_routes"]["public_node_dashboard"] == "/public-node"

assert j["privacy_boundaries"]["plaintext_addresses_redacted"] is True
assert j["privacy_boundaries"]["plaintext_from_address_written_to_public_closeout"] is False
assert j["privacy_boundaries"]["plaintext_recipient_address_written_to_public_closeout"] is False
assert j["privacy_boundaries"]["private_key_seen_by_chat_or_repo"] is False
assert j["privacy_boundaries"]["seed_phrase_seen_by_chat_or_repo"] is False
assert j["privacy_boundaries"]["private_settlement_ledger_not_served_publicly"] is True

assert j["closed_boundaries"]["read_only_public_closeout_seal"] is True
assert j["closed_boundaries"]["does_not_execute_command"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_create_public_mutation"] is True
assert j["closed_boundaries"]["does_not_replace_private_ledger"] is True

blob = json.dumps(j, sort_keys=True).lower()
assert "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" not in blob
assert "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5" not in blob

assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1" in md
assert "/public-node/wc-to-void/settlement-evidence-pack-v1.json" in md
assert "/public-node/wc-to-void/redacted-settlement-receipt-v1.json" in md
assert "Does not create public mutation" in md

print("VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1_JSON_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1_PROOF_GREEN"
