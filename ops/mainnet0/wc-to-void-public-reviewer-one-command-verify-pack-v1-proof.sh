#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
import re
from pathlib import Path

j = json.loads(Path("docs/public/public-node-wc-to-void-public-reviewer-one-command-verify-pack-v1.json").read_text())
md = Path("docs/public/public-node-wc-to-void-public-reviewer-one-command-verify-pack-v1.md").read_text()

assert j["marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1"
assert j["scope"] == "first_wc_to_void_settlement_public_reviewer_verify_pack"
assert j["status"] == "ready"
assert j["chain_id"] == "2050"
assert j["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert j["value_void"] == "1.000000"
assert j["value_wei"] == "1000000000000000000"
assert j["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"

targets = j["review_targets"]
assert targets["dashboard"] == "/public-node"
assert targets["route_index"] == "/public-node/route-index.json"
assert targets["closeout_seal_json"] == "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json"
assert targets["closeout_seal_html"] == "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1"
assert targets["evidence_pack_json"] == "/public-node/wc-to-void/settlement-evidence-pack-v1.json"
assert targets["redacted_receipt_json"] == "/public-node/wc-to-void/redacted-settlement-receipt-v1.json"

assert "VOID_WC_TO_VOID_CLOSEOUT_SEAL_DASHBOARD_LINK_V1" in j["required_public_markers"]
assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1" in j["required_public_markers"]
assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_V1" in j["required_public_markers"]
assert "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1" in j["required_public_markers"]

assert j["sealed_heads"]["closeout_seal_dashboard_link_v1"] == "058cc434"
assert j["sealed_heads"]["closeout_seal_runtime_v1"] == "932fb7be"
assert j["sealed_heads"]["closeout_seal_static_v1"] == "a9d384b3"

assert j["sealed_tags"]["closeout_seal_dashboard_link_cross_box"] == "ckpt-wc-to-void-closeout-seal-dashboard-link-v1-cross-box-green-20260621-132148"
assert j["sealed_tags"]["closeout_seal_runtime_cross_box"] == "ckpt-wc-to-void-settlement-evidence-closeout-seal-runtime-v1-cross-box-green-20260621-131301"
assert j["sealed_tags"]["closeout_seal_static_cross_box"] == "ckpt-wc-to-void-settlement-evidence-closeout-seal-static-v1-cross-box-green-20260621-130417"

cmd = j["copy_paste_verify_command"]
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN" in cmd
assert "VOID_PUBLIC_BASE" in cmd
assert "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json" in cmd
assert "/public-node/wc-to-void/settlement-evidence-pack-v1.json" in cmd
assert "/public-node/wc-to-void/redacted-settlement-receipt-v1.json" in cmd
assert "does_not_create_public_mutation" in cmd
assert "plaintext_addresses_redacted" in cmd
assert "re.search" in cmd

assert j["privacy_boundaries"]["plaintext_addresses_redacted"] is True
assert j["privacy_boundaries"]["private_settlement_ledger_not_served_publicly"] is True
assert j["closed_boundaries"]["read_only_reviewer_pack"] is True
assert j["closed_boundaries"]["does_not_execute_settlement_command"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_create_public_mutation"] is True

blob = json.dumps(j, sort_keys=True) + "\n" + md
assert re.search(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])", blob) is None

assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1" in md
assert "read-only" in md.lower()
assert "42-character address-shaped values" in md

print("VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_PROOF_GREEN"
