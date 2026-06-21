#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
from pathlib import Path

src = Path("src/index.ts").read_text()
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert "VOID_WC_TO_VOID_CLOSEOUT_SEAL_DASHBOARD_LINK_V1" in src
assert "VOID_WC_TO_VOID_EVIDENCE_PACK_DISCOVERY_LINK_V1" in src

assert 'id="publicNodeWcToVoidEvidencePackDiscoveryCard"' in src
assert 'id="publicNodeWcToVoidCloseoutSealHtmlLink"' in src
assert 'id="publicNodeWcToVoidCloseoutSealJsonLink"' in src
assert 'id="publicNodeWcToVoidEvidencePackHtmlLink"' in src
assert 'id="publicNodeWcToVoidEvidencePackJsonLink"' in src
assert 'id="publicNodeWcToVoidRedactedReceiptJsonLink"' in src

assert "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1" in src
assert "/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json" in src
assert "/public-node/wc-to-void/settlement-evidence-pack-v1" in src
assert "/public-node/wc-to-void/settlement-evidence-pack-v1.json" in src
assert "/public-node/wc-to-void/redacted-settlement-receipt-v1.json" in src

assert "Public closeout seal:" in src
assert "Public mutation path" in src
assert "Plaintext addresses redacted" in src

assert 'APP.get("/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/settlement-evidence-closeout-seal-v1"' in src
assert '\napp.get("/public-node/wc-to-void/settlement-evidence-closeout-seal-v1' not in src

assert "public_literal_get_count=165" in safety_doc
assert "public_literal_get_unique_count=165" in safety_doc
assert "public_literal_get_count=165" in safety_proof
assert "public_literal_get_unique_count=165" in safety_proof

print("VOID_WC_TO_VOID_CLOSEOUT_SEAL_DASHBOARD_LINK_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_CLOSEOUT_SEAL_DASHBOARD_LINK_V1_PROOF_GREEN"
