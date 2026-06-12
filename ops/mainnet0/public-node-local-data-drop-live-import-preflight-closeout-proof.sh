#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-preflight-closeout.md"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Live Import Preflight Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_CLOSEOUT_V1" "$DOC"
grep -Fq "no-mutation live import preflight tool" "$DOC"
grep -Fq "does not run the import" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-preflight-proof.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_GREEN" "$DOC"
grep -Fq "488cea5e" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-live-import-preflight-green-20260612-150133" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_COMMITTED" "$DOC"
grep -Fq "source file counting works" "$DOC"
grep -Fq "nested source files are listed" "$DOC"
grep -Fq "mutation_performed=false" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY=true \
  bash ops/mainnet0/public-node-local-data-drop-live-import-preflight-proof.sh

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" \
  | python3 -c 'import sys,json; j=json.load(sys.stdin); assert j.get("object_count")==1, j; assert j.get("marker")=="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j; print("validated_live_weighted_count_still_1=true")'

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_CLOSEOUT_V1_GREEN"
