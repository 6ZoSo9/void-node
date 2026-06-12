#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-precision-only-storm-baseline.md"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Precision-Only Storm Baseline Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-live-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_PRECISION_ONLY_STORM_BASELINE_V1" "$DOC"
grep -Fq "Alienware is temporarily offline after a storm" "$DOC"
grep -Fq "Precision is the only live truth box" "$DOC"
grep -Fq "931e6c91" "$DOC"
grep -Fq "ckpt-public-node-hide-legacy-intelligence-live-closeout-precision-green-20260612-084242" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_LIVE_CLOSEOUT_V1_GREEN" "$DOC"
grep -Fq "Cross-box confirmation is deferred" "$DOC"
grep -Fq "Do not describe this lane as cross-box green" "$DOC"
grep -Fq "Precision-only green" "$DOC"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-precision-only-storm-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-precision-only-storm-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-precision-only-storm-weighted.json

python3 - <<'PY'
import json
from pathlib import Path

ready = json.loads(Path("/tmp/void-precision-only-storm-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-precision-only-storm-weighted.json").read_text())
html = Path("/tmp/void-precision-only-storm-public-node.html").read_text()

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready

assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
assert weighted.get("object_count") == 1, weighted

assert "publicNodeLocalDataDropWeightedCard" in html
assert "publicNodeLocalDataDropObjectBrowserCard" in html
assert "publicNodeLocalDataDropImportOwnDataCard" in html
assert "publicNodeDataIntelligenceCard" in html
assert "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_HIDDEN_UNTIL_LIVE_UI_V1" in html

top = html.index("publicNodeLocalDataDropHumanDemoTopCard")
hidden = html.index("publicNodeDataIntelligenceCard")
assert top < hidden, "human demo must remain before hidden legacy intelligence"

print("validated_precision_ready=true")
print("validated_weighted_count=1")
print("validated_human_demo_top_card=true")
print("validated_object_browser_card=true")
print("validated_import_own_data_card=true")
print("validated_legacy_intelligence_hidden=true")
PY

bash ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-live-closeout-proof.sh

echo "VOID_PUBLIC_NODE_PRECISION_ONLY_STORM_BASELINE_V1_GREEN"
