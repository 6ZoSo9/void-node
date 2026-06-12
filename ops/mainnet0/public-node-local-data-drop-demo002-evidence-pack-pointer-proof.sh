#!/usr/bin/env bash
set -euo pipefail

DOCS=(
  docs/public/public-node-local-data-drop.md
  docs/public/public-node-quickstart.md
  docs/public/public-node-tester-bundle.md
  docs/public/public-node-tester-handoff.md
)

MARKERS=(
  VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_POINTER_DOC_V1
  VOID_PUBLIC_NODE_QUICKSTART_DEMO002_EVIDENCE_PACK_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_BUNDLE_DEMO002_EVIDENCE_PACK_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_EVIDENCE_PACK_POINTER_V1
)

CHECKPOINT="1853a9d8"
TAG="ckpt-public-node-local-data-drop-demo002-evidence-pack-green-20260612-221420"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
PACK="ops/mainnet0/public-node-local-data-drop-demo002-evidence-pack.sh"
PACK_PROOF="ops/mainnet0/public-node-local-data-drop-demo002-evidence-pack-proof.sh"

echo "=== VOID Public Node Demo 002 Evidence Pack Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -x "$PACK"
test -x "$PACK_PROOF"
bash -n "$PACK"
bash -n "$PACK_PROOF"

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  marker="${MARKERS[$i]}"
  test -f "$doc"
  grep -Fq "$marker" "$doc"
  grep -Fq "$PACK" "$doc"
  grep -Fq "$CHECKPOINT" "$doc"
  grep -Fq "$TAG" "$doc"
  grep -Fq "$SHA" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_V1_GREEN" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_MANIFEST_V1" "$doc"
  grep -Fq "demo002-evidence-pack.tar.gz" "$doc"
  grep -Fq "sha256sums.txt" "$doc"
  grep -Fq "runtime/latest.json" "$doc"
  grep -Fq "offline_verified=true" "$doc"
  grep -Fq "network_fetch_during_import=false" "$doc"
  grep -Fq "trusted_as_network_truth=false" "$doc"
done

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_evidence_pack_doc_pointers_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_POINTER_PROOF_V1_GREEN"
