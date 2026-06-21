#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
import re
from pathlib import Path

j = json.loads(Path("docs/public/public-node-wc-to-void-settlement-evidence-final-public-index-v1.json").read_text())
md = Path("docs/public/public-node-wc-to-void-settlement-evidence-final-public-index-v1.md").read_text()
src = Path("src/index.ts").read_text()
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert j["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1"
assert j["scope"] == "first_wc_to_native_void_settlement_final_public_index"
assert j["status"] == "sealed_index_ready"
assert j["chain_id"] == "2050"
assert j["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert j["value_void"] == "1.000000"
assert j["settlement_record_key"] == "710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1"

entry = j["public_review_entrypoint"]
assert entry["public_node_dashboard"] == "/public-node"
assert entry["human_handoff_note"] == "/public-node/wc-to-void/public-reviewer-handoff-note-v1"
assert entry["handoff_note_json"] == "/public-node/wc-to-void/public-reviewer-handoff-note-v1.json"
assert entry["reviewer_verify_pack"] == "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1"
assert entry["reviewer_verify_pack_json"] == "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json"
assert entry["expected_reviewer_success_marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN"

chain = j["sealed_public_chain"]
assert len(chain) == 7
assert [x["order"] for x in chain] == list(range(1, 8))
markers = "\n".join(x.get("marker", "") + "\n" + x.get("runtime_marker", "") + "\n" + x.get("success_marker", "") for x in chain)
for marker in [
    "VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_PROOF_GREEN",
    "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_V1",
    "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_V1",
    "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1",
    "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1",
    "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1",
    "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_RUNTIME_V1",
    "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_DASHBOARD_LINK_V1",
]:
    assert marker in markers

routes = json.dumps(j["sealed_public_chain"], sort_keys=True) + json.dumps(j["public_review_entrypoint"], sort_keys=True)
for route in [
    "/public-node",
    "/public-node/wc-to-void/redacted-settlement-receipt-v1.json",
    "/public-node/wc-to-void/settlement-evidence-pack-v1",
    "/public-node/wc-to-void/settlement-evidence-pack-v1.json",
    "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1",
    "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json",
    "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1",
    "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json",
    "/public-node/wc-to-void/public-reviewer-handoff-note-v1",
    "/public-node/wc-to-void/public-reviewer-handoff-note-v1.json",
]:
    assert route in routes or route in md

assert j["sealed_heads"]["public_reviewer_handoff_note_dashboard_link"] == "0ceb8870"
assert j["sealed_heads"]["public_reviewer_handoff_note_runtime"] == "09391e41"
assert j["sealed_heads"]["public_reviewer_handoff_note_static"] == "efdfc6a1"
assert j["sealed_heads"]["public_reviewer_verify_pack_dashboard_link"] == "dc5b62f0"
assert j["sealed_heads"]["public_reviewer_verify_pack_runtime"] == "b31fa78a"
assert j["sealed_heads"]["public_reviewer_one_command_verify_pack_static"] == "c9047823"

assert j["sealed_cross_box_tags"]["public_reviewer_handoff_note_dashboard_link"] == "ckpt-wc-to-void-public-reviewer-handoff-note-dashboard-link-v1-cross-box-green-20260621-160736"
assert j["sealed_cross_box_tags"]["public_reviewer_handoff_note_runtime"] == "ckpt-wc-to-void-public-reviewer-handoff-note-runtime-v1-cross-box-green-20260621-160059"
assert j["sealed_cross_box_tags"]["public_reviewer_handoff_note_static"] == "ckpt-wc-to-void-public-reviewer-handoff-note-v1-cross-box-green-20260621-155248"

for k, v in j["closed_boundaries"].items():
    assert v is True, k

assert j["public_surface_safety"]["public_literal_get_count"] == 169
assert j["public_surface_safety"]["public_literal_get_unique_count"] == 169
assert j["public_surface_safety"]["public_node_literal_mutation_handler_count"] == 0
assert "public_literal_get_count=169" in safety_doc
assert "public_literal_get_unique_count=169" in safety_doc
assert "public_literal_get_count=169" in safety_proof
assert "public_literal_get_unique_count=169" in safety_proof

assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1" in md
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN" in md
assert "Public safety count remains `169`" in md
assert "Public node mutation handler count remains `0`" in md

# This is a static docs/proof artifact only; it must not mount a new runtime route.
assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1" not in src
assert "/public-node/wc-to-void/settlement-evidence-final-public-index-v1" not in src

blob = json.dumps(j, sort_keys=True) + "\n" + md
assert re.search(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])", blob) is None

print("VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1_PROOF_GREEN"
