#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
from pathlib import Path

src = Path("src/index.ts").read_text()
static_seal = json.loads(Path("docs/public/public-node-wc-to-void-settlement-evidence-closeout-seal-v1.json").read_text())
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert static_seal["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1"
assert static_seal["status"] == "sealed"
assert static_seal["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
assert static_seal["chain_id"] == "2050"
assert static_seal["value_void"] == "1.000000"

assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_RUNTIME_V1" in src
assert "wcToVoidSettlementEvidenceCloseoutSealV1" in src
assert "__void_wc_to_void_settlement_evidence_closeout_seal_runtime_v1_mounted" in src
assert "mountWcToVoidSettlementEvidenceCloseoutSealRuntimeV1" in src
assert 'setTimeout(mountWcToVoidSettlementEvidenceCloseoutSealRuntimeV1, 400);' in src
assert 'APP.get("/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/settlement-evidence-closeout-seal-v1"' in src

assert '{ path: "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json", kind: "json", marker: "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_V1"' in src
assert '{ path: "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1", kind: "html", marker: "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_RUNTIME_V1"' in src

assert "read_only_public_closeout_seal: true" in src
assert "does_not_create_public_mutation: true" in src
assert "does_not_call_rpc: true" in src
assert "does_not_broadcast_tx: true" in src
assert "does_not_send_void: true" in src
assert "private_settlement_ledger_not_served_publicly: true" in src
assert '\napp.get("/public-node/wc-to-void/settlement-evidence-closeout-seal-v1' not in src


start = src.index("const wcToVoidSettlementEvidenceCloseoutSealV1 = {")
end = src.index("} as const;", start)
closeout_block = src[start:end].lower()
assert "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" not in closeout_block
assert "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5" not in closeout_block


def _void_public_get_counts_v1(text):
    import re
    m1 = re.search(r"public_literal_get_count=(\d+)", text)
    m2 = re.search(r"public_literal_get_unique_count=(\d+)", text)
    assert m1, "missing public_literal_get_count"
    assert m2, "missing public_literal_get_unique_count"
    return int(m1.group(1)), int(m2.group(1))

_doc_count, _doc_unique = _void_public_get_counts_v1(safety_doc)
_proof_count, _proof_unique = _void_public_get_counts_v1(safety_proof)
assert _doc_count >= 165
assert _doc_unique >= 165
assert _proof_count >= 165
assert _proof_unique >= 165
assert _doc_count == _doc_unique
assert _proof_count == _proof_unique

print("VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_RUNTIME_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_CLOSEOUT_SEAL_RUNTIME_V1_PROOF_GREEN"
