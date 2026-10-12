#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Weighted Local Data Drop Status Card Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-weighted-status-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-weighted-status-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-weighted-status-weighted.json

grep -Fq "publicNodeLocalDataDropWeightedStatus" /tmp/void-weighted-status-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1" /tmp/void-weighted-status-public-node.html
grep -Fq "Status: checking weighted local objects" /tmp/void-weighted-status-public-node.html
grep -Fq 'fetch("/public-node/local-data-drop/weighted.json"' /tmp/void-weighted-status-public-node.html
grep -Fq "weighted local " /tmp/void-weighted-status-public-node.html
grep -Fq " live on this node." /tmp/void-weighted-status-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

ready = json.loads(Path("/tmp/void-weighted-status-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-weighted-status-weighted.json").read_text())

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready
assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
assert weighted.get("object_count") == 1, weighted
assert len(weighted.get("weighted_records", [])) == 1, weighted

print("validated_ready=true")
print("validated_status_card_html=true")
print("validated_weighted_object_count=1")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_V1_GREEN"
