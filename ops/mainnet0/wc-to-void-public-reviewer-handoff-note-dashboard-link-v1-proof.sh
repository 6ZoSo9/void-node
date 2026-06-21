#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import re
from pathlib import Path

src = Path("src/index.ts").read_text()
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_DASHBOARD_LINK_V1" in src
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_RUNTIME_V1" in src
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1" in src
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1" in src
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1" in src

assert 'id="publicNodeWcToVoidEvidencePackDiscoveryCard"' in src
assert 'id="publicNodeWcToVoidReviewerHandoffNoteHtmlLink"' in src
assert 'id="publicNodeWcToVoidReviewerHandoffNoteJsonLink"' in src
assert 'id="publicNodeWcToVoidReviewerVerifyPackHtmlLink"' in src
assert 'id="publicNodeWcToVoidReviewerVerifyPackJsonLink"' in src
assert 'id="publicNodeWcToVoidCloseoutSealHtmlLink"' in src
assert 'id="publicNodeWcToVoidCloseoutSealJsonLink"' in src
assert 'id="publicNodeWcToVoidEvidencePackHtmlLink"' in src
assert 'id="publicNodeWcToVoidEvidencePackJsonLink"' in src
assert 'id="publicNodeWcToVoidRedactedReceiptJsonLink"' in src

assert "/public-node/wc-to-void/public-reviewer-handoff-note-v1" in src
assert "/public-node/wc-to-void/public-reviewer-handoff-note-v1.json" in src
assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" in src
assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json" in src

assert "Public reviewer handoff note:" in src
assert "Public reviewer verify pack:" in src
assert "Public closeout seal:" in src
assert "public_mutation=false" in src
assert "read_only=true" in src

assert 'APP.get("/public-node/wc-to-void/public-reviewer-handoff-note-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/public-reviewer-handoff-note-v1"' in src
assert '\napp.get("/public-node/wc-to-void/public-reviewer-handoff-note-v1' not in src

def counts(text):
    m1 = re.search(r"public_literal_get_count=(\d+)", text)
    m2 = re.search(r"public_literal_get_unique_count=(\d+)", text)
    assert m1 and m2
    return int(m1.group(1)), int(m2.group(1))

assert counts(safety_doc) == (169, 169)
assert counts(safety_proof) == (169, 169)

print("VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_DASHBOARD_LINK_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_DASHBOARD_LINK_V1_PROOF_GREEN"
