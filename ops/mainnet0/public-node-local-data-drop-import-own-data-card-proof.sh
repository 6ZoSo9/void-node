#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

echo "=== VOID Public Node Local Data Drop Import Own Data Card Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-import-own-data-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-import-own-data-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-import-own-data-weighted.json

grep -Fq "publicNodeLocalDataDropImportOwnDataCard" /tmp/void-import-own-data-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1" /tmp/void-import-own-data-public-node.html
grep -Fq "Import Your Own Local Data" /tmp/void-import-own-data-public-node.html
grep -Fq "Node runners can place a small local file" /tmp/void-import-own-data-public-node.html
grep -Fq "mkdir -p /tmp/void-local-data-drop-demo" /tmp/void-import-own-data-public-node.html
grep -Fq "echo 'hello from my VOID node' &gt; /tmp/void-local-data-drop-demo/my-first-void-object.txt" /tmp/void-import-own-data-public-node.html
grep -Fq "DATA_DIR=&quot;\$PWD/data_a&quot; MAX_FILES=25 ops/mainnet0/public-node-local-data-drop-import-dir.sh /tmp/void-local-data-drop-demo" /tmp/void-import-own-data-public-node.html
grep -Fq "/public-node/local-data-drop.json" /tmp/void-import-own-data-public-node.html
grep -Fq "/public-node/local-data-drop/weighted.json" /tmp/void-import-own-data-public-node.html
grep -Fq "docs/public/public-node-local-data-drop-import-directory-runbook.md" /tmp/void-import-own-data-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

ready = json.loads(Path("/tmp/void-import-own-data-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-import-own-data-weighted.json").read_text())

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready
assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
assert weighted.get("object_count") == 1, weighted
assert len(weighted.get("weighted_records", [])) == 1, weighted

print("validated_import_own_data_card_html=true")
print("validated_import_own_data_command_copy=true")
print("validated_weighted_route_still_live=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_V1_GREEN"
