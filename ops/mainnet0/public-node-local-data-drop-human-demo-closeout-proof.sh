#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
DOC="docs/public/public-node-local-data-drop-human-demo-closeout.md"
SHA="0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d"
OBJ="void-weighted-seed-v1.txt"

echo "=== VOID Public Node Local Data Drop Human Demo Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-weighted-status-card-closeout-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-object-browser-card-closeout-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-import-own-data-card-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropWeightedCard" "$DOC"
grep -Fq "publicNodeLocalDataDropObjectBrowserCard" "$DOC"
grep -Fq "publicNodeLocalDataDropImportOwnDataCard" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "/public-node/local-data-drop/proof/$SHA.json" "$DOC"
grep -Fq "/public-node/local-data-drop/$OBJ" "$DOC"
grep -Fq "/public-node/local-data-drop/by-sha256/$SHA" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "weighted_records_len=1" "$DOC"
grep -Fq "echo 'hello from my VOID node' > /tmp/void-local-data-drop-demo/my-first-void-object.txt" "$DOC"
grep -Fq 'DATA_DIR="$PWD/data_a" MAX_FILES=25 ops/mainnet0/public-node-local-data-drop-import-dir.sh /tmp/void-local-data-drop-demo' "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-weighted-status-card-closeout-green-20260612-005002" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-object-browser-card-closeout-green-20260612-073538" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-own-data-card-closeout-green-20260612-075545" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_CLOSEOUT_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_CLOSEOUT_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_CLOSEOUT_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-weighted-status-card-closeout-proof.sh
bash ops/mainnet0/public-node-local-data-drop-object-browser-card-closeout-proof.sh
bash ops/mainnet0/public-node-local-data-drop-import-own-data-card-closeout-proof.sh

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-human-demo-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-human-demo-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-human-demo-weighted.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/proof/$SHA.json" > /tmp/void-human-demo-proof.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/$OBJ" > /tmp/void-human-demo-object.txt
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/by-sha256/$SHA" > /tmp/void-human-demo-by-sha.txt

grep -Fq "publicNodeLocalDataDropWeightedStatus" /tmp/void-human-demo-public-node.html
grep -Fq "publicNodeLocalDataDropObjectBrowserCard" /tmp/void-human-demo-public-node.html
grep -Fq "publicNodeLocalDataDropImportOwnDataCard" /tmp/void-human-demo-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1" /tmp/void-human-demo-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1" /tmp/void-human-demo-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1" /tmp/void-human-demo-public-node.html
grep -Fq "echo 'hello from my VOID node' &gt; /tmp/void-local-data-drop-demo/my-first-void-object.txt" /tmp/void-human-demo-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

SHA = "0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d"
OBJ = "void-weighted-seed-v1.txt"

ready = json.loads(Path("/tmp/void-human-demo-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-human-demo-weighted.json").read_text())
proof = json.loads(Path("/tmp/void-human-demo-proof.json").read_text())
obj = Path("/tmp/void-human-demo-object.txt").read_text()
by_sha = Path("/tmp/void-human-demo-by-sha.txt").read_text()

assert ready.get("ready") is True, ready
assert ready.get("gap") == 0, ready
assert weighted.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1", weighted
records = weighted.get("weighted_records", [])
assert weighted.get("object_count") == len(records) == 1, weighted
record = records[0]
assert record.get("object_id") == OBJ, record
assert record.get("sha256") == SHA, record
assert proof.get("marker") == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1", proof
assert proof.get("object_id") == OBJ, proof
assert proof.get("sha256") == SHA, proof
assert obj == by_sha, (obj, by_sha)
assert "VOID weighted local data drop seed v1." in obj, obj

print("validated_human_demo_public_page=true")
print("validated_human_demo_weighted_count=true")
print("validated_human_demo_object_browser=true")
print("validated_human_demo_import_instructions=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_CLOSEOUT_V1_GREEN"
