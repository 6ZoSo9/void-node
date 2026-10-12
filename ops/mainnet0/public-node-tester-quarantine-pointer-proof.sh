#!/usr/bin/env bash
set -euo pipefail

DOCS=(
  docs/public/public-node-tester-handoff.md
  docs/public/public-node-tester-bundle.md
  docs/public/public-node-quickstart.md
)

MARKERS=(
  VOID_PUBLIC_NODE_TESTER_HANDOFF_LIVE_RUNTIME_QUARANTINE_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_BUNDLE_LIVE_RUNTIME_QUARANTINE_POINTER_V1
  VOID_PUBLIC_NODE_QUICKSTART_LIVE_RUNTIME_QUARANTINE_POINTER_V1
)

echo "=== VOID Public Node Tester Quarantine Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_TESTER_QUARANTINE_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  marker="${MARKERS[$i]}"
  test -f "$doc"
  grep -q "$marker" "$doc"
  grep -q "08383516" "$doc"
  grep -q "ckpt-public-node-live-runtime-quarantine-green-20260612-210820" "$doc"
  grep -q "4a49a8c9" "$doc"
  grep -q "ckpt-public-node-live-runtime-quarantine-status-pointer-green-20260612-211330" "$doc"
  grep -q "VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN" "$doc"
  grep -q "/public-node/local-data-drop/proof/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871.json" "$doc"
done

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "tester_docs_quarantine_pointers_verified=true"
echo "VOID_PUBLIC_NODE_TESTER_QUARANTINE_POINTER_PROOF_V1_GREEN"
