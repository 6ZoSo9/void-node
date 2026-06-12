#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
LIVE_DATA_DIR="${VOID_LIVE_DATA_DIR:-$PWD/data_a}"

echo "=== VOID Public Node Local Data Drop Live Import Demo 001 Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "live_data_dir=$LIVE_DATA_DIR"

test -f "$LIVE_DATA_DIR/public-node/local-data-drop/objects/live-import-demo-001.txt"
test -f "$LIVE_DATA_DIR/public-node/local-data-drop/receipts/live-import-demo-001.txt.json"
test -f "$LIVE_DATA_DIR/public-node/local-data-drop/objects/void-weighted-seed-v1.txt"
test -f "$LIVE_DATA_DIR/public-node/local-data-drop/receipts/void-weighted-seed-v1.txt.json"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" -o /tmp/void-live-import-demo-001-weighted.json

python3 - <<'PY'
import json
j=json.load(open("/tmp/void-live-import-demo-001-weighted.json"))
records = j.get("weighted_records") or j.get("records") or j.get("objects") or []
ids = [x.get("object_id") or x.get("id") or x.get("name") for x in records]
assert j.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", j
assert j.get("object_count") == 2, j
assert len(records) == 2, j
assert "live-import-demo-001.txt" in ids, ids
assert "void-weighted-seed-v1.txt" in ids, ids
print("validated_live_route_object_count_2=true")
print("validated_live_import_demo_001_present=true")
print("record_ids="+",".join(ids))
PY

bash ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_V1_GREEN"
