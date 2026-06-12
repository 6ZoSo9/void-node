#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Hide Legacy Intelligence Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-hide-legacy-intelligence-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-hide-legacy-intelligence-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-hide-legacy-intelligence-weighted.json

grep -Fq "publicNodeLocalDataDropHumanDemoTopCard" /tmp/void-hide-legacy-intelligence-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_UI_V1" /tmp/void-hide-legacy-intelligence-public-node.html
grep -Fq "publicNodeLocalDataDropHumanDemoTopStatus" /tmp/void-hide-legacy-intelligence-public-node.html
grep -Fq "Status: checking local data demo" /tmp/void-hide-legacy-intelligence-public-node.html
grep -Fq "publicNodeDataIntelligenceCard" /tmp/void-hide-legacy-intelligence-public-node.html
grep -Fq 'id="publicNodeDataIntelligenceCard" style="display:none"' /tmp/void-hide-legacy-intelligence-public-node.html
grep -Fq "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_HIDDEN_UNTIL_LIVE_UI_V1" /tmp/void-hide-legacy-intelligence-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

ready = json.loads(Path("/tmp/void-hide-legacy-intelligence-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-hide-legacy-intelligence-weighted.json").read_text())
html = Path("/tmp/void-hide-legacy-intelligence-public-node.html").read_text()

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
records = weighted.get("weighted_records", [])
assert weighted.get("object_count") == len(records) == 1, weighted

top = html.index("publicNodeLocalDataDropHumanDemoTopCard")
hidden = html.index('id="publicNodeDataIntelligenceCard" style="display:none"')
weighted_card = html.index("publicNodeLocalDataDropWeightedCard")

assert top < hidden, "local data demo top card should appear before hidden legacy intelligence"
assert top < weighted_card, "local data demo top card should appear before weighted card"
assert "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_HIDDEN_UNTIL_LIVE_UI_V1" in html

print("validated_local_data_demo_top_card_visible=true")
print("validated_legacy_intelligence_hidden_live=true")
print("validated_weighted_count_still_live=1")
PY

echo "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_V1_GREEN"
