#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Import Stack Lite Smoke v2 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V2"
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f docs/public/public-node-local-data-drop-import-stack-status.md
test -f docs/public/public-node-local-data-drop-live-import-safe-ladder-status.md
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh
test -x ops/mainnet0/public-node-local-data-drop-live-import-plan.sh

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" -o /tmp/void-lite-smoke-weighted-v2.json

python3 - <<'PY'
import json
j=json.load(open("/tmp/void-lite-smoke-weighted-v2.json"))
records = j.get("weighted_records") or j.get("records") or j.get("objects") or []
ids = [x.get("object_id") or x.get("id") or x.get("name") for x in records]
count = int(j.get("object_count", 0))
assert j.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert count >= 1, j
assert count == len(records), j
assert "void-weighted-seed-v1.txt" in ids, ids
print("object_count="+str(count))
print("record_ids="+",".join(ids))
print("marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V2_GREEN"
