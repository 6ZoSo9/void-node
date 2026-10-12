#!/usr/bin/env bash
set -euo pipefail

CARD="docs/public/public-node-local-data-drop-demo002-closeout.md"
INDEX="docs/public/public-node-local-data-drop.md"
HEAD_EXPECTED="73a08335"
TAG_EXPECTED="ckpt-public-node-local-data-drop-demo002-verify-evidence-pack-pointer-green-20260612-225042"
SHA_EXPECTED="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"

echo "=== VOID Public Node Demo 002 Closeout Card Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_CARD_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -f "$CARD"
test -f "$INDEX"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_CARD_V1" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_POINTER_V1" "$INDEX"
grep -Fq "$CARD" "$INDEX"

grep -Fq "$HEAD_EXPECTED" "$CARD"
grep -Fq "$TAG_EXPECTED" "$CARD"
grep -Fq "$SHA_EXPECTED" "$CARD"
grep -Fq "$HEAD_EXPECTED" "$INDEX"
grep -Fq "$TAG_EXPECTED" "$INDEX"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1_IMPORTED" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_PROOF_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_PROOF_V1_GREEN" "$CARD"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_PROOF_V1_GREEN" "$CARD"

grep -Fq "ops/mainnet0/public-node-local-data-drop-demo002-evidence-pack.sh" "$CARD"
grep -Fq "ops/mainnet0/public-node-local-data-drop-demo002-verify-evidence-pack.sh" "$CARD"
grep -Fq "ops/mainnet0/public-node-local-data-drop-demo002-receipt-intake-status.sh" "$CARD"

grep -Fq "offline_verified=true" "$CARD"
grep -Fq "network_fetch_during_import=false" "$CARD"
grep -Fq "network_fetch=false" "$CARD"
grep -Fq "trusted_as_network_truth=false" "$CARD"

grep -Fq "public_routes_only=true" "$CARD"
grep -Fq "read_only=true" "$CARD"
grep -Fq "mutation=false" "$CARD"
grep -Fq "money_movement=false" "$CARD"
grep -Fq "wallet_send=false" "$CARD"
grep -Fq "validator_mutation=false" "$CARD"

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo002_closeout_card_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_CARD_PROOF_V1_GREEN"
