#!/usr/bin/env bash
set -euo pipefail

DOCS=(
  docs/public/public-node-local-data-drop.md
  docs/public/public-node-quickstart.md
  docs/public/public-node-tester-bundle.md
  docs/public/public-node-tester-handoff.md
)

MARKERS=(
  VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_POINTER_DOC_V1
  VOID_PUBLIC_NODE_QUICKSTART_DEMO002_EVIDENCE_ROUNDTRIP_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_BUNDLE_DEMO002_EVIDENCE_ROUNDTRIP_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_EVIDENCE_ROUNDTRIP_POINTER_V1
)

CHECKPOINT="22f3c751"
TAG="ckpt-public-node-local-data-drop-demo002-evidence-roundtrip-green-20260612-220315"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
ROUNDTRIP="ops/mainnet0/public-node-local-data-drop-demo002-evidence-roundtrip.sh"
ROUNDTRIP_PROOF="ops/mainnet0/public-node-local-data-drop-demo002-evidence-roundtrip-proof.sh"

echo "=== VOID Public Node Demo 002 Evidence Roundtrip Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -x "$ROUNDTRIP"
test -x "$ROUNDTRIP_PROOF"
bash -n "$ROUNDTRIP"
bash -n "$ROUNDTRIP_PROOF"

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  marker="${MARKERS[$i]}"
  test -f "$doc"
  grep -Fq "$marker" "$doc"
  grep -Fq "$ROUNDTRIP" "$doc"
  grep -Fq "$CHECKPOINT" "$doc"
  grep -Fq "$TAG" "$doc"
  grep -Fq "$SHA" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$doc"
  grep -Fq "offline_verified=true" "$doc"
  grep -Fq "network_fetch_during_import=false" "$doc"
  grep -Fq "trusted_as_network_truth=false" "$doc"
done

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_evidence_roundtrip_doc_pointers_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_POINTER_PROOF_V1_GREEN"
