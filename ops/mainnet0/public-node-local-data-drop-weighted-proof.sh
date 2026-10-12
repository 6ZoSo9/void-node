#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Weighted Local Data Drop Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-weighted-local-data-drop.json
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > /tmp/void-weighted-route-index.json
curl -fsS --max-time 8 "$BASE/public-node/route-manifest.json" > /tmp/void-weighted-route-manifest.json
curl -fsS --max-time 8 "$BASE/public-node/self-check-snapshot.json" > /tmp/void-weighted-self-check.json

python3 - <<'PY'
import json
from pathlib import Path

weighted = json.loads(Path("/tmp/void-weighted-local-data-drop.json").read_text())
assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
assert weighted.get("status") == "weighted_local_data_drop_ready", weighted
records = weighted.get("weighted_records", weighted.get("records", []))
assert isinstance(records, list), weighted
assert weighted.get("object_count") == len(records), weighted

if weighted.get("object_count") == 0:
    assert weighted.get("empty_state") == "no_operator_local_data_drop_objects_present", weighted

route_index = json.loads(Path("/tmp/void-weighted-route-index.json").read_text())
routes = route_index.get("routes", [])
assert any(
    r.get("path") == "/public-node/local-data-drop/weighted.json"
    and r.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1"
    for r in routes
), route_index

manifest = json.loads(Path("/tmp/void-weighted-route-manifest.json").read_text())
manifest_routes = manifest.get("routes", [])
assert any(
    r.get("path") == "/public-node/local-data-drop/weighted.json"
    and r.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1"
    for r in manifest_routes
), manifest

self_check = json.loads(Path("/tmp/void-weighted-self-check.json").read_text())
assert self_check.get("marker") == "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1", self_check
text = json.dumps(self_check, sort_keys=True)
assert "/public-node/local-data-drop/weighted.json" in text, self_check

print("validated_weighted_live_route=true")
print("validated_weighted_live_route_index=true")
print("validated_weighted_live_route_manifest=true")
print("validated_weighted_live_self_check=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1_GREEN"
