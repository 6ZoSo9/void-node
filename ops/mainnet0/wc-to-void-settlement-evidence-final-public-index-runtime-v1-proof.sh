#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
import re
from pathlib import Path

src = Path("src/index.ts").read_text()
j = json.loads(Path("docs/public/public-node-wc-to-void-settlement-evidence-final-public-index-v1.json").read_text())
md = Path("docs/public/public-node-wc-to-void-settlement-evidence-final-public-index-v1.md").read_text()
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert j["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1"
assert j["status"] == "sealed_live_index_ready"
assert j["public_review_entrypoint"]["final_public_index"] == "/public-node/wc-to-void/settlement-evidence-final-public-index-v1"
assert j["public_review_entrypoint"]["final_public_index_json"] == "/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json"
assert j["public_review_entrypoint"]["expected_reviewer_success_marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN"

assert len(j["sealed_public_chain"]) == 8
assert [x["order"] for x in j["sealed_public_chain"]] == list(range(1, 9))
assert j["sealed_public_chain"][-1]["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1"
assert j["sealed_public_chain"][-1]["runtime_marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1"

assert j["closed_boundaries"]["static_index_content"] is True
assert j["closed_boundaries"]["live_read_only_runtime_exposure"] is True
assert j["closed_boundaries"]["runtime_route_is_get_only"] is True
assert j["closed_boundaries"]["safety_count_updated_to_include_routes"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_create_public_mutation"] is True
assert j["closed_boundaries"]["does_not_expose_private_ledger"] is True
assert j["closed_boundaries"]["does_not_expose_plaintext_party_addresses"] is True

assert j["public_surface_safety"]["public_literal_get_count"] == 171
assert j["public_surface_safety"]["public_literal_get_unique_count"] == 171
assert j["public_surface_safety"]["public_node_literal_mutation_handler_count"] == 0

assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1" in src
assert "wcToVoidSettlementEvidenceFinalPublicIndexV1" in src
assert "__void_wc_to_void_settlement_evidence_final_public_index_runtime_v1_mounted" in src
assert "mountWcToVoidSettlementEvidenceFinalPublicIndexRuntimeV1" in src
assert 'setTimeout(mountWcToVoidSettlementEvidenceFinalPublicIndexRuntimeV1, 400);' in src

assert 'APP.get("/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/settlement-evidence-final-public-index-v1"' in src
assert '\napp.get("/public-node/wc-to-void/settlement-evidence-final-public-index-v1' not in src

assert '{ path: "/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json", kind: "json", marker: "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1"' in src
assert '{ path: "/public-node/wc-to-void/settlement-evidence-final-public-index-v1", kind: "html", marker: "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1"' in src

assert "/public-node/wc-to-void/public-reviewer-handoff-note-v1" in src
assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" in src
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN" in src

assert "Public safety count is `171`" in md or "Public safety count is updated to `171`" in md
assert "Public node mutation handler count remains `0`" in md

assert "public_literal_get_count=171" in safety_doc
assert "public_literal_get_unique_count=171" in safety_doc
assert "public_literal_get_count=171" in safety_proof
assert "public_literal_get_unique_count=171" in safety_proof

start = src.index("const wcToVoidSettlementEvidenceFinalPublicIndexV1 = ")
end = src.index(" as const;", start)
block = src[start:end]
assert re.search(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])", block) is None

print("VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1_PROOF_GREEN"
