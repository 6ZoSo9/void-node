#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CURRENT_STATUS_POINTER_V1"
CARD="docs/public/public-node-local-data-drop-demo002-closeout.md"
HEAD_EXPECTED="f17b335d"
TAG_EXPECTED="ckpt-public-node-local-data-drop-demo002-closeout-index-pointer-green-20260612-225901"

echo "=== VOID Public Node Demo 002 Current Status Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CURRENT_STATUS_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -f "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_CARD_V1" "$CARD"

FOUND=0
for doc in   docs/public/current-public-status.md   docs/public/mainnet0-current-status.md   docs/public/public-release-status.md   docs/public/README.md
do
  [ -f "$doc" ] || continue
  if grep -Fq "$MARKER" "$doc"; then
    grep -Fq "Status: green / closed." "$doc"
    grep -Fq "$CARD" "$doc"
    grep -Fq "$HEAD_EXPECTED" "$doc"
    grep -Fq "$TAG_EXPECTED" "$doc"
    grep -Fq "one-command evidence roundtrip" "$doc"
    grep -Fq "shareable evidence pack" "$doc"
    grep -Fq "offline evidence-pack verifier" "$doc"
    grep -Fq "trusted_as_network_truth=false" "$doc"
    grep -Fq "network_fetch_during_import=false" "$doc"
    grep -Fq "network_fetch=false" "$doc"
    grep -Fq "mutation=false" "$doc"
    grep -Fq "money_movement=false" "$doc"
    FOUND=1
  fi
done

if [ "$FOUND" -ne 1 ]; then
  echo "demo002_current_status_pointer_missing=true"
  exit 1
fi

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_current_status_pointer_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CURRENT_STATUS_POINTER_PROOF_V1_GREEN"
