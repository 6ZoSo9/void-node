#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/datanet-demo-object-browser-proof-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-datanet-demo-object-browser-proof}"

mkdir -p "$OUT"

echo "=== DataNet demo object browser proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=datanet_demo_object_browser_proof"
echo "money_movement=false"
echo "validator_mutation=false"

expect_grep() {
  local name="$1"
  local pattern="$2"
  local file="$3"
  if ! grep -q "$pattern" "$file"; then
    echo "[fatal] missing $name"
    echo "pattern=$pattern"
    echo "file=$file"
    exit 1
  fi
  echo "[ok] $name"
}

echo
echo "=== [1] source markers ==="
expect_grep "backend object browser route marker" "VOID_DATANET_PUBLISH_SHIM_OBJECT_BROWSER_ROUTE_V1" src/index.ts
expect_grep "object browser route path" "/datanet/v1/objects" src/index.ts
expect_grep "object browser UI marker" "VOID_DATANET_DEMO_OBJECT_BROWSER_V1" public/demo/datanet/index.html
expect_grep "object browser renderer marker" "VOID_DATANET_DEMO_OBJECT_BROWSER_RENDER_V1" public/demo/datanet/index.html
expect_grep "object browser fetch path" "/datanet/v1/objects?limit=50" public/demo/datanet/index.html
expect_grep "local datanet objects copy" "Local DataNet objects" public/demo/datanet/index.html
expect_grep "source peer copy" "source peer=" public/demo/datanet/index.html
expect_grep "copy share action" "copy-share" public/demo/datanet/index.html

echo
echo "=== [2] live readiness ==="
curl -fsS --max-time 15 "$BASE/__void/ready.json" > "$OUT/ready.json"
cat "$OUT/ready.json"
echo
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot_live")
PY

echo
echo "=== [3] served UI markers ==="
curl -fsS --max-time 20 "$BASE/datanet-demo" > "$OUT/datanet-demo.html"
expect_grep "served UI marker" "VOID_DATANET_DEMO_OBJECT_BROWSER_V1" "$OUT/datanet-demo.html"
expect_grep "served render marker" "VOID_DATANET_DEMO_OBJECT_BROWSER_RENDER_V1" "$OUT/datanet-demo.html"
expect_grep "served objects fetch path" "/datanet/v1/objects?limit=50" "$OUT/datanet-demo.html"
expect_grep "served local objects copy" "Local DataNet objects" "$OUT/datanet-demo.html"

echo
echo "=== [4] publish source object ==="
PLAINTEXT="VOID_DATANET_DEMO_OBJECT_BROWSER_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "%s" "$PLAINTEXT" > "$OUT/plain.txt"
PLAIN_B64="$(base64 -w0 "$OUT/plain.txt")"

python3 - "$PLAIN_B64" "$WHO" > "$OUT/publish-payload.json" <<'PY'
import json, sys
print(json.dumps({
  "name": "datanet-demo-object-browser-proof.txt",
  "mime": "text/plain",
  "plaintext_b64": sys.argv[1],
  "who": sys.argv[2],
}))
PY

curl -fsS --max-time 40 \
  -H "content-type: application/json" \
  -X POST \
  --data @"$OUT/publish-payload.json" \
  "$BASE/datanet/v1/publish?who=$WHO" > "$OUT/publish.json"

python3 - "$OUT/publish.json" "$OUT/dataset-id.txt" <<'PY'
import json, pathlib, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
dataset = j.get("id") or j.get("dataset_id") or j.get("datasetId")
assert dataset, j
pathlib.Path(sys.argv[2]).write_text(str(dataset))
print("[ok] published dataset=" + str(dataset))
print("[ok] root=" + str(j.get("merkleRootHex") or ""))
print("[ok] size=" + str(j.get("sizeBytes") or ""))
PY

DATASET_ID="$(cat "$OUT/dataset-id.txt")"

echo
echo "=== [5] fetch object browser route ==="
curl -fsS --max-time 40 "$BASE/datanet/v1/objects?limit=25" > "$OUT/objects.json"
python3 - "$OUT/objects.json" "$DATASET_ID" "$WHO" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
dataset=sys.argv[2]
who=sys.argv[3]

assert j.get("ok") is True, j
assert j.get("marker") == "VOID_DATANET_PUBLISH_SHIM_OBJECT_BROWSER_ROUTE_V1", j
items=j.get("items") or []
assert items, j

hit=None
for item in items:
    if item.get("id") == dataset or item.get("dataset_id") == dataset:
        hit=item
        break

assert hit, {"missing_dataset": dataset, "items": items[:5]}
assert hit.get("name") == "datanet-demo-object-browser-proof.txt", hit
assert hit.get("mime") == "text/plain", hit
assert hit.get("who") == who, hit
assert int(hit.get("sizeBytes") or 0) > 0, hit
assert hit.get("merkleRootHex"), hit
assert hit.get("local_fetch_url"), hit
assert hit.get("share_url_path"), hit
assert str(hit.get("share_url_path")).startswith("/datanet-demo?id="), hit

print("[ok] object browser marker and dataset entry verified")
print("[ok] dataset_id=" + dataset)
print("[ok] share_url_path=" + str(hit.get("share_url_path")))
PY

echo
echo "=== [6] verify object fetch still works ==="
curl -fsS --max-time 40 "$BASE/datanet/v1/fetch/$DATASET_ID?who=$WHO" > "$OUT/fetch.json"
python3 - "$OUT/fetch.json" "$DATASET_ID" "$OUT/plain.txt" <<'PY'
import base64, json, sys
j=json.load(open(sys.argv[1]))
dataset=sys.argv[2]
expected=open(sys.argv[3], "rb").read()
assert j.get("ok") is True, j
assert str(j.get("id") or "") == dataset, j
b64 = j.get("plaintext_b64") or j.get("cipher_b64") or ""
assert b64, j
assert base64.b64decode(b64) == expected, j
print("[ok] local fetch bytes matched")
PY

echo
echo "VOID_DATANET_DEMO_OBJECT_BROWSER_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "out=$OUT"
