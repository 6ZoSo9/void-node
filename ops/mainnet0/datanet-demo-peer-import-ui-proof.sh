#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/datanet-demo-peer-import-ui-proof-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-datanet-demo-peer-import-ui-proof}"
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

echo "=== DataNet demo peer import UI proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=datanet_demo_peer_import_ui_proof"
echo "money_movement=false"
echo "validator_mutation=false"

echo
echo "=== [1] static UI markers ==="
test -f "$HTML"
expect_grep "peer import ui marker" "VOID_DATANET_DEMO_PEER_IMPORT_UI_V1" "$HTML"
expect_grep "peer url input" "quickPeerHttpInput" "$HTML"
expect_grep "peer url helper" "function quickPeerHttpInputValue" "$HTML"
expect_grep "peer import function" "function quickImportFromPeer" "$HTML"
expect_grep "peer import route" "/datanet/v1/import-from-peer" "$HTML"
expect_grep "import button copy" "Import from peer" "$HTML"
expect_grep "raw import output copy" "Raw Store/Fetch/Import output" "$HTML"
expect_grep "base store/fetch marker" "VOID_DATANET_DEMO_TEXT_STORE_FETCH_UI_V1" "$HTML"
expect_grep "share/open marker" "VOID_DATANET_DEMO_SHARE_OPEN_BY_ID_UI_V1" "$HTML"

echo
echo "=== [2] served page markers ==="
curl -fsS --max-time 20 "$BASE/datanet-demo" > "$OUT/datanet-demo.html"
expect_grep "served peer import ui marker" "VOID_DATANET_DEMO_PEER_IMPORT_UI_V1" "$OUT/datanet-demo.html"
expect_grep "served peer url input" "quickPeerHttpInput" "$OUT/datanet-demo.html"
expect_grep "served peer import function" "function quickImportFromPeer" "$OUT/datanet-demo.html"
expect_grep "served peer import route" "/datanet/v1/import-from-peer" "$OUT/datanet-demo.html"

echo
echo "=== [3] publish source dataset ==="
PLAINTEXT="VOID_DATANET_DEMO_PEER_IMPORT_UI_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "%s" "$PLAINTEXT" > "$OUT/plain.txt"
PLAIN_B64="$(base64 -w0 "$OUT/plain.txt")"

python3 - "$PLAIN_B64" "$WHO" > "$OUT/payload.json" <<'PY'
import json, sys
print(json.dumps({
  "name": "datanet-demo-peer-import-ui-proof.txt",
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

echo
echo "=== [4] exercise same import route used by UI ==="
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
echo "=== [5] verify local fetch bytes ==="
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
echo "VOID_DATANET_DEMO_PEER_IMPORT_UI_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "out=$OUT"
