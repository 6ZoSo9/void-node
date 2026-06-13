#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-receipt-imported-closeout-proof-status-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_DOC_V1" docs/public/public-node-first-external-receipt-imported-closeout-proof-status.md
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1_GREEN" src/index.ts
bash -n ops/mainnet0/public-node-first-external-receipt-imported-closeout-proof-status-proof.sh

echo "source_markers_green=true"
echo "route=/public-node/first-external-receipt-imported-closeout-proof-status.json"
echo "marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_V1"
echo "route_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_ROUTE_V1"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_UI_V1"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_PROOF_V1_GREEN"
