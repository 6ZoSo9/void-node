#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
import re
from pathlib import Path

src = Path("src/index.ts").read_text()
static_note = json.loads(Path("docs/public/public-node-wc-to-void-public-reviewer-handoff-note-v1.json").read_text())
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert static_note["marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1"
assert static_note["status"] == "ready"
assert static_note["audience"] == "outside_public_reviewer"

assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_RUNTIME_V1" in src
assert "wcToVoidPublicReviewerHandoffNoteV1" in src
assert "__void_wc_to_void_public_reviewer_handoff_note_runtime_v1_mounted" in src
assert "mountWcToVoidPublicReviewerHandoffNoteRuntimeV1" in src
assert 'setTimeout(mountWcToVoidPublicReviewerHandoffNoteRuntimeV1, 400);' in src

assert 'APP.get("/public-node/wc-to-void/public-reviewer-handoff-note-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/public-reviewer-handoff-note-v1"' in src
assert '\napp.get("/public-node/wc-to-void/public-reviewer-handoff-note-v1' not in src

assert '{ path: "/public-node/wc-to-void/public-reviewer-handoff-note-v1.json", kind: "json", marker: "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1"' in src
assert '{ path: "/public-node/wc-to-void/public-reviewer-handoff-note-v1", kind: "html", marker: "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_RUNTIME_V1"' in src

assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" in src
assert "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json" in src
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN" in src

assert "read_only_handoff_note" in src
assert "does_not_execute_settlement_command" in src
assert "does_not_create_public_mutation" in src
assert "does_not_call_rpc" in src
assert "does_not_send_void" in src
assert "does_not_broadcast_tx" in src

assert "public_literal_get_count=169" in safety_doc
assert "public_literal_get_unique_count=169" in safety_doc
assert "public_literal_get_count=169" in safety_proof
assert "public_literal_get_unique_count=169" in safety_proof

start = src.index("const wcToVoidPublicReviewerHandoffNoteV1 = ")
end = src.index(" as const;", start)
block = src[start:end]
assert re.search(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])", block) is None

print("VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_RUNTIME_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_RUNTIME_V1_PROOF_GREEN"
