#!/usr/bin/env bash
set -euo pipefail

CARD="docs/public/public-node-local-data-drop-demo002-closeout.md"
MARKER="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_INDEX_POINTER_V1"
HEAD_EXPECTED="603169e4"
TAG_EXPECTED="ckpt-public-node-local-data-drop-demo002-closeout-card-green-20260612-225519"

echo "=== VOID Public Node Demo 002 Closeout Index Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_INDEX_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -f "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_CARD_V1" "$CARD"

FOUND=0
for doc in docs/public/README.md docs/public/index.md docs/public/public-node.md; do
  [ -f "$doc" ] || continue
  if grep -Fq "$MARKER" "$doc"; then
    grep -Fq "$CARD" "$doc"
    grep -Fq "$HEAD_EXPECTED" "$doc"
    grep -Fq "$TAG_EXPECTED" "$doc"
    grep -Fq "shareable evidence pack" "$doc"
    grep -Fq "offline evidence-pack verification" "$doc"
    FOUND=1
  fi
done

if [ "$FOUND" -ne 1 ]; then
  echo "closeout_index_pointer_missing=true"
  exit 1
fi

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_closeout_index_pointer_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_INDEX_POINTER_PROOF_V1_GREEN"
