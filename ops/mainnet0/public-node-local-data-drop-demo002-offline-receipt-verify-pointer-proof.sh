#!/usr/bin/env bash
set -euo pipefail

DOCS=(
  docs/public/public-node-local-data-drop.md
  docs/public/public-node-quickstart.md
  docs/public/public-node-tester-bundle.md
  docs/public/public-node-tester-handoff.md
)

MARKERS=(
  VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_DOC_V1
  VOID_PUBLIC_NODE_QUICKSTART_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_BUNDLE_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_V1
  VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_V1
)

CHECKPOINT="8f6b623e"
TAG="ckpt-public-node-local-data-drop-demo002-offline-receipt-verify-green-20260612-214402"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh"
SMOKE="ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh"

echo "=== VOID Public Node Demo 002 Offline Receipt Verify Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -x "$VERIFY"
test -x "$SMOKE"
bash -n "$VERIFY"
bash -n "$SMOKE"

for i in "${!DOCS[@]}"; do
  doc="${DOCS[$i]}"
  marker="${MARKERS[$i]}"
  test -f "$doc"
  grep -Fq "$marker" "$doc"
  grep -Fq "$CHECKPOINT" "$doc"
  grep -Fq "$TAG" "$doc"
  grep -Fq "$SHA" "$doc"
  grep -Fq "$VERIFY" "$doc"
  grep -Fq "$SMOKE" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1" "$doc"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_PROOF_V1_GREEN" "$doc"
  grep -Fq "public routes only" "$doc"
  grep -Fq "read-only" "$doc"
done

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_offline_receipt_verify_doc_pointers_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_PROOF_V1_GREEN"
