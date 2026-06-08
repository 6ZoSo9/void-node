#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/datanet-demo-import-share-url-ui-proof-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-datanet-demo-import-share-url-ui-proof}"
HTML="public/demo/datanet/index.html"

mkdir -p "$OUT"

expect_grep() {
  local name="$1"
  local pattern="$2"
  local file="$3"

  if ! grep -q "$pattern" "$file"; then
    echo "[fatal] missing $name in $file"
    echo "pattern=$pattern"
    exit 1
  fi

  echo "[ok] $name"
}

echo "=== DataNet demo import share URL UI proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=datanet_demo_import_share_url_ui_proof"
echo "money_movement=false"
echo "validator_mutation=false"

echo
echo "=== [1] static UI markers ==="
test -f "$HTML"
expect_grep "import share url marker" "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1" "$HTML"
expect_grep "share import input" "quickShareImportInput" "$HTML"
expect_grep "share parser function" "function quickParseShareUrl" "$HTML"
expect_grep "share import function" "function quickImportFromShareUrl" "$HTML"
expect_grep "import share url button" "Import share URL" "$HTML"
expect_grep "paste share url copy" "Paste peer share URL" "$HTML"
expect_grep "peer import marker" "VOID_DATANET_DEMO_PEER_IMPORT_UI_V1" "$HTML"
expect_grep "peer import route" "/datanet/v1/import-from-peer" "$HTML"

echo
echo "=== [2] served page markers ==="
curl -fsS --max-time 20 "$BASE/datanet-demo" > "$OUT/datanet-demo.html"
expect_grep "served import share url marker" "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1" "$OUT/datanet-demo.html"
expect_grep "served share import input" "quickShareImportInput" "$OUT/datanet-demo.html"
expect_grep "served share parser function" "function quickParseShareUrl" "$OUT/datanet-demo.html"
expect_grep "served share import function" "function quickImportFromShareUrl" "$OUT/datanet-demo.html"

echo
echo "=== [3] publish source dataset and construct share URL ==="
PLAINTEXT="VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "%s" "$PLAINTEXT" > "$OUT/plain.txt"
PLAIN_B64="$(base64 -w0 "$OUT/plain.txt")"

python3 - "$PLAIN_B64" "$WHO" > "$OUT/payload.json" <<'PY'
import json, sys
print(json.dumps({
  "name": "datanet-demo-import-share-url-ui-proof.txt",
  "mime": "text/plain",
  "plaintext_b64": sys.argv[1],
  "who": sys.argv[2],
}))
PY

curl -fsS --max-time 40 \
  -H "content-type: application/json" \
  -X POST \
  --data @"$OUT/payload.json" \
  "$BASE/datanet/v1/publish?who=$WHO" > "$OUT/publish.json"

python3 - "$OUT/publish.json" "$OUT/dataset-id.txt" <<'PY'
import json, pathlib, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
dataset = j.get("id") or j.get("dataset_id") or j.get("datasetId")
assert dataset, j
pathlib.Path(sys.argv[2]).write_text(str(dataset))
print("[ok] published dataset=" + str(dataset))
print("[ok] merkleRootHex=" + str(j.get("merkleRootHex") or ""))
print("[ok] sizeBytes=" + str(j.get("sizeBytes") or ""))
PY

DATASET_ID="$(cat "$OUT/dataset-id.txt")"
SHARE_URL="$BASE/datanet-demo?id=$DATASET_ID&who=$WHO"

echo "[ok] share_url=$SHARE_URL"

echo
echo "=== [4] verify share URL parse semantics ==="
python3 - "$SHARE_URL" "$BASE" "$DATASET_ID" "$WHO" <<'PY'
from urllib.parse import urlparse, parse_qs
import sys

share, expected_peer, expected_id, expected_who = sys.argv[1:5]
u = urlparse(share)
peer = f"{u.scheme}://{u.netloc}"
q = parse_qs(u.query)
dataset = (q.get("id") or [""])[0]
who = (q.get("who") or [""])[0]

assert peer == expected_peer, (peer, expected_peer)
assert dataset == expected_id, (dataset, expected_id)
assert who == expected_who, (who, expected_who)

print("[ok] share URL parses to peer_http=" + peer)
print("[ok] share URL parses to dataset_id=" + dataset)
print("[ok] share URL parses to source_who=" + who)
PY

echo
echo "=== [5] exercise import route using parsed share URL values ==="
python3 - "$BASE" "$DATASET_ID" "$WHO" > "$OUT/import-payload.json" <<'PY'
import json, sys
print(json.dumps({
  "peer_http": sys.argv[1],
  "dataset_id": sys.argv[2],
  "who": sys.argv[3],
  "source_who": sys.argv[3],
}))
PY

curl -fsS --max-time 60 \
  -H "content-type: application/json" \
  -X POST \
  --data @"$OUT/import-payload.json" \
  "$BASE/datanet/v1/import-from-peer?who=$WHO" > "$OUT/import.json"

python3 - "$OUT/import.json" "$DATASET_ID" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
dataset=sys.argv[2]
assert j.get("ok") is True, j
assert j.get("marker") == "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1", j
assert j.get("dataset_id") == dataset, j
assert j.get("imported") is True, j
assert j.get("local_fetch_ok") is True, j
assert j.get("id_match") is True, j
print("[ok] import route returned ok")
print("[ok] dataset_id=" + dataset)
print("[ok] copied_to_requested_id=" + str(j.get("copied_to_requested_id")))
PY

echo
echo "=== [6] verify local fetch bytes ==="
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
print("[ok] fetched dataset=" + dataset)
print("[ok] fetched bytes matched source")
PY

echo
echo "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "share_url=$SHARE_URL"
echo "out=$OUT"
