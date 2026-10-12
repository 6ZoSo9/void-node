#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Human Demo Top Card Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-human-demo-top-card-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-human-demo-top-card-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-human-demo-top-card-weighted.json

grep -Fq "publicNodeLocalDataDropHumanDemoTopCard" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_UI_V1" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "publicNodeLocalDataDropHumanDemoTopStatus" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_STATUS_UI_V1" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "Local data demo" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "Jump straight to the storage demo" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "publicNodeLocalDataDropHumanDemoWeightedJump" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "publicNodeLocalDataDropHumanDemoBrowserJump" /tmp/void-human-demo-top-card-public-node.html
grep -Fq "publicNodeLocalDataDropHumanDemoImportJump" /tmp/void-human-demo-top-card-public-node.html
grep -Fq 'href="#publicNodeLocalDataDropWeightedCard"' /tmp/void-human-demo-top-card-public-node.html
grep -Fq 'href="#publicNodeLocalDataDropObjectBrowserCard"' /tmp/void-human-demo-top-card-public-node.html
grep -Fq 'href="#publicNodeLocalDataDropImportOwnDataCard"' /tmp/void-human-demo-top-card-public-node.html
grep -Fq 'fetch("/public-node/local-data-drop/weighted.json"' /tmp/void-human-demo-top-card-public-node.html
grep -Fq "Demo ready." /tmp/void-human-demo-top-card-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

ready = json.loads(Path("/tmp/void-human-demo-top-card-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-human-demo-top-card-weighted.json").read_text())
html = Path("/tmp/void-human-demo-top-card-public-node.html").read_text()

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
records = weighted.get("weighted_records", [])
assert weighted.get("object_count") == len(records) == 1, weighted
assert records[0].get("object_id") == "void-weighted-seed-v1.txt", records[0]

top = html.index("publicNodeLocalDataDropHumanDemoTopCard")
intel = html.index("publicNodeDataIntelligenceCard")
weighted_card = html.index("publicNodeLocalDataDropWeightedCard")
browser_card = html.index("publicNodeLocalDataDropObjectBrowserCard")
import_card = html.index("publicNodeLocalDataDropImportOwnDataCard")

assert top < intel, "top card must appear before Node intelligence"
assert top < weighted_card < browser_card < import_card, "demo jump targets must remain in order"

print("validated_top_card_live=true")
print("validated_top_card_before_old_metrics=true")
print("validated_top_card_weighted_count=1")
print("validated_top_card_jump_targets=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_V1_GREEN"
