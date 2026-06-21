#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import json
import re
from pathlib import Path

src = Path("src/index.ts").read_text()
static_pack = json.loads(Path("docs/public/public-node-wc-to-void-public-reviewer-one-command-verify-pack-v1.json").read_text())
safety_doc = Path("docs/public/public-surface-safety-index-v1.md").read_text()
safety_proof = Path("ops/mainnet0/public-surface-safety-index-v1-proof.sh").read_text()

assert static_pack["marker"] == "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1"
assert static_pack["status"] == "ready"
assert static_pack["tx_hash"] == "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"

assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1" in src
assert "wcToVoidPublicReviewerOneCommandVerifyPackV1" in src
assert "__void_wc_to_void_public_reviewer_verify_pack_runtime_v1_mounted" in src
assert "mountWcToVoidPublicReviewerVerifyPackRuntimeV1" in src
assert 'setTimeout(mountWcToVoidPublicReviewerVerifyPackRuntimeV1, 400);' in src
assert 'APP.get("/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json"' in src
assert 'APP.get("/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1"' in src

assert '{ path: "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json", kind: "json", marker: "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1"' in src
assert '{ path: "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1", kind: "html", marker: "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1"' in src

assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN" in src
assert "VOID_PUBLIC_BASE" in src
assert "read_only_reviewer_pack" in src
assert "does_not_create_public_mutation" in src
assert "does_not_call_rpc" in src
assert "does_not_send_void" in src
assert "does_not_broadcast_tx" in src
assert '\napp.get("/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1' not in src

assert "public_literal_get_count=167" in safety_doc
assert "public_literal_get_unique_count=167" in safety_doc
assert "public_literal_get_count=167" in safety_proof
assert "public_literal_get_unique_count=167" in safety_proof

start = src.index("const wcToVoidPublicReviewerOneCommandVerifyPackV1 = ")
end = src.index(" as const;", start)
block = src[start:end]
assert re.search(r"0x[0-9a-fA-F]{40}(?![0-9a-fA-F])", block) is None

print("VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1_PROOF_GREEN"
