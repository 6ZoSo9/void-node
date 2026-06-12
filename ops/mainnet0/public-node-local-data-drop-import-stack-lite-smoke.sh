#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Import Stack Lite Smoke v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f docs/public/public-node-local-data-drop-import-stack-status.md
test -f docs/public/public-node-local-data-drop-live-import-preflight-closeout.md
test -f docs/public/public-node-local-data-drop-live-import-preflight-pointer-closeout.md
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_V1" docs/public/public-node-local-data-drop-import-stack-status.md
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_CLOSEOUT_V1" docs/public/public-node-local-data-drop-live-import-preflight-closeout.md
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_CLOSEOUT_V1" docs/public/public-node-local-data-drop-live-import-preflight-pointer-closeout.md
grep -Fq "mutation_performed=false" ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh
grep -Fq "VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY" ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" \
  | python3 -c 'import sys,json; j=json.load(sys.stdin); assert j.get("object_count")==1, j; assert j.get("marker")=="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j; print("object_count=1"); print("marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1")'

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN"
