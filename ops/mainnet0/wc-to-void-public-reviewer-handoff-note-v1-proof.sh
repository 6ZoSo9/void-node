#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
import re
from pathlib import Path

j = json.loads(Path("docs/public/public-node-wc-to-void-public-reviewer-handoff-note-v1.json").read_text())
md = Path("docs/public/public-node-wc-to-void-public-reviewer-handoff-note-v1.md").read_text()

assert j["marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1"
assert j["scope"] == "first_wc_to_void_settlement_public_reviewer_handoff"
assert j["status"] == "ready"
assert j["audience"] == "outside_public_reviewer"
assert j["chain_id"] == "2050"
assert j["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert j["value_void"] == "1.000000"
assert j["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"

steps = j["review_path"]
assert steps[0]["path"] == "/public-node"
assert steps[0]["expected_marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1"
assert steps[1]["path"] == "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1"
assert steps[1]["expected_marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1"
assert steps[2]["path"] == "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json"
assert steps[2]["expected_marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1"
assert steps[3]["expected_success_marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN"

green = "\n".join(j["green_means"])
assert "route index" in green.lower()
assert "closeout seal" in green.lower()
assert "redacted receipt" in green.lower()
assert "read-only" in green.lower()
assert "does not send VOID" in green

assert j["closed_boundaries"]["read_only_handoff_note"] is True
assert j["closed_boundaries"]["does_not_execute_settlement_command"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_create_public_mutation"] is True
assert j["closed_boundaries"]["does_not_expose_private_ledger"] is True
assert j["closed_boundaries"]["does_not_expose_plaintext_party_addresses"] is True

assert j["sealed_heads"]["public_reviewer_verify_pack_dashboard_link_v1"] == "dc5b62f0"
assert j["sealed_heads"]["public_reviewer_verify_pack_runtime_v1"] == "b31fa78a"
assert j["sealed_heads"]["public_reviewer_one_command_verify_pack_v1"] == "c9047823"
assert j["sealed_heads"]["closeout_seal_dashboard_link_v1"] == "058cc434"

assert j["sealed_tags"]["public_reviewer_verify_pack_dashboard_link_cross_box"] == "ckpt-wc-to-void-public-reviewer-verify-pack-dashboard-link-v1-cross-box-green-20260621-154659"
assert j["sealed_tags"]["public_reviewer_verify_pack_runtime_cross_box"] == "ckpt-wc-to-void-public-reviewer-verify-pack-runtime-v1-cross-box-green-20260621-154103"
assert j["sealed_tags"]["public_reviewer_one_command_verify_pack_cross_box"] == "ckpt-wc-to-void-public-reviewer-one-command-verify-pack-v1-cross-box-green-20260621-153341"

assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1" in md
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN" in md
assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" in md
assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json" in md
assert "read-only" in md.lower()
assert "does not execute a settlement command" in md

blob = json.dumps(j, sort_keys=True) + "\n" + md
assert re.search(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])", blob) is None

print("VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1_PROOF_GREEN"
