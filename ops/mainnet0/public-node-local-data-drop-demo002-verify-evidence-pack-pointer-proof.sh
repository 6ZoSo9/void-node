#!/usr/bin/env bash
set -euo pipefail

DOCS=(
  docs/public/public-node-local-data-drop.md
  docs/public/public-node-quickstart.md
  docs/public/public-node-tester-bundle.md
  docs/public/public-node-tester-handoff.md
)

MARKERS=(
  VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_DOC_V1
  VOID_PUBLIC_NODE_QUICKSTART_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_BUNDLE_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_V1
)

CHECKPOINT="583ae18b"
TAG="ckpt-public-node-local-data-drop-demo002-verify-evidence-pack-green-20260612-224621"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-evidence-pack.sh"
VERIFY_PROOF="ops/mainnet0/public-node-local-data-drop-demo002-verify-evidence-pack-proof.sh"

echo "=== VOID Public Node Demo 002 Verify Evidence Pack Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -x "$VERIFY"
test -x "$VERIFY_PROOF"
bash -n "$VERIFY"
bash -n "$VERIFY_PROOF"

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  marker="${MARKERS[$i]}"
  test -f "$doc"
  grep -Fq "$marker" "$doc"
  grep -Fq "$VERIFY" "$doc"
  grep -Fq "$CHECKPOINT" "$doc"
  grep -Fq "$TAG" "$doc"
  grep -Fq "$SHA" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_V1_GREEN" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_PROOF_V1_GREEN" "$doc"
  grep -Fq "offline_verified=true" "$doc"
  grep -Fq "network_fetch=false" "$doc"
  grep -Fq "trusted_as_network_truth=false" "$doc"
  grep -Fq "trusted_as_network_truth=true must be rejected" "$doc"
  grep -Fq "sha256sums.txt" "$doc"
  grep -Fq "manifest.json" "$doc"
  grep -Fq "runtime/latest.json" "$doc"
done

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_verify_evidence_pack_doc_pointers_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_PROOF_V1_GREEN"
