#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
SHA="0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d"
OBJ="void-weighted-seed-v1.txt"

echo "=== VOID Public Node Local Data Drop Object Browser Card Live Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > /tmp/void-object-browser-ready.json
curl -fsS --max-time 8 "$BASE/public-node" > /tmp/void-object-browser-public-node.html
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/weighted.json" > /tmp/void-object-browser-weighted.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/proof/$SHA.json" > /tmp/void-object-browser-proof.json
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/$OBJ" > /tmp/void-object-browser-object.txt
curl -fsS --max-time 8 "$BASE/public-node/local-data-drop/by-sha256/$SHA" > /tmp/void-object-browser-by-sha.txt

grep -Fq "publicNodeLocalDataDropObjectBrowserCard" /tmp/void-object-browser-public-node.html
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1" /tmp/void-object-browser-public-node.html
grep -Fq "publicNodeWeightedObjectBrowserWeightedLink" /tmp/void-object-browser-public-node.html
grep -Fq "publicNodeWeightedObjectBrowserProofLink" /tmp/void-object-browser-public-node.html
grep -Fq "publicNodeWeightedObjectBrowserObjectLink" /tmp/void-object-browser-public-node.html
grep -Fq "publicNodeWeightedObjectBrowserShaLink" /tmp/void-object-browser-public-node.html
grep -Fq "/public-node/local-data-drop/weighted.json" /tmp/void-object-browser-public-node.html
grep -Fq "/public-node/local-data-drop/proof/$SHA.json" /tmp/void-object-browser-public-node.html
grep -Fq "/public-node/local-data-drop/$OBJ" /tmp/void-object-browser-public-node.html
grep -Fq "/public-node/local-data-drop/by-sha256/$SHA" /tmp/void-object-browser-public-node.html

python3 - <<'PY'
import json
from pathlib import Path

SHA = "0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d"
OBJ = "void-weighted-seed-v1.txt"

ready = json.loads(Path("/tmp/void-object-browser-ready.json").read_text())
weighted = json.loads(Path("/tmp/void-object-browser-weighted.json").read_text())
proof = json.loads(Path("/tmp/void-object-browser-proof.json").read_text())
obj = Path("/tmp/void-object-browser-object.txt").read_text()
by_sha = Path("/tmp/void-object-browser-by-sha.txt").read_text()

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

print("validated_object_browser_html=true")
print("validated_weighted_link=true")
print("validated_proof_link=true")
print("validated_object_id_link=true")
print("validated_sha256_link=true")
PY

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_V1_GREEN"
