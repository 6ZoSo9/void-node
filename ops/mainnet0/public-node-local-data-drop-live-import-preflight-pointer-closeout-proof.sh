#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-preflight-pointer-closeout.md"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Live Import Preflight Pointer Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight-pointer-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_CLOSEOUT_V1" "$DOC"
grep -Fq "no-mutation preflight tool before any live import" "$DOC"
grep -Fq "run preflight" "$DOC"
grep -Fq "confirm expected object count" "$DOC"
grep -Fq "only then run the live import command intentionally" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-live-import-runbook.md" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_DOC_V1" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_READY" "$DOC"
grep -Fq "4685baa9" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-live-import-preflight-pointer-green-20260612-150457" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_V1_GREEN" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY=true \
  bash ops/mainnet0/public-node-local-data-drop-live-import-preflight-pointer-proof.sh

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" \
  | python3 -c 'import sys,json; j=json.load(sys.stdin); assert j.get("object_count")==1, j; assert j.get("marker")=="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j; print("validated_live_weighted_count_still_1=true")'

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_CLOSEOUT_V1_GREEN"
