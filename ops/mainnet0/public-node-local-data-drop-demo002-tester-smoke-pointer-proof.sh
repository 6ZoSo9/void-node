#!/usr/bin/env bash
set -euo pipefail

DOCS=(
  docs/public/public-node-local-data-drop.md
  docs/public/public-node-quickstart.md
  docs/public/public-node-tester-bundle.md
  docs/public/public-node-tester-handoff.md
)

MARKERS=(
  VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_POINTER_DOC_V1
  VOID_PUBLIC_NODE_QUICKSTART_DEMO002_SMOKE_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_BUNDLE_DEMO002_SMOKE_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_SMOKE_POINTER_V1
)

SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
CHECKPOINT="1a53883a"
TAG="ckpt-public-node-local-data-drop-demo002-tester-smoke-green-20260612-212707"

echo "=== VOID Public Node Demo 002 Tester Smoke Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -x ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh
test -x ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke-proof.sh

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  marker="${MARKERS[$i]}"
  test -f "$doc"
  grep -q "$marker" "$doc"
  grep -q "$CHECKPOINT" "$doc"
  grep -q "$TAG" "$doc"
  grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_PROOF_V1_GREEN" "$doc"
  grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN" "$doc"
  grep -q "ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh" "$doc"
  grep -q "$SHA" "$doc"
  grep -q "public-route-only" "$doc"
  grep -q "read-only" "$doc"
done

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_tester_smoke_doc_pointers_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_POINTER_PROOF_V1_GREEN"
