#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

OUT="${OUT:-/tmp/datanet-demo-import-share-url-two-box-proof-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-datanet-demo-share-url-two-box-proof}"
PRECISION_LOCAL="${PRECISION_LOCAL:-http://127.0.0.1:4100}"
PRECISION_TAILNET="${PRECISION_TAILNET:-http://100.122.245.125:4100}"
ALIEN="${ALIEN:-zoso@100.122.79.39}"

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

echo "=== DataNet demo import share URL two-box proof ==="
echo "out=$OUT"
echo "precision_local=$PRECISION_LOCAL"
echo "precision_tailnet=$PRECISION_TAILNET"
echo "alien=$ALIEN"
echo "mutation=datanet_cross_box_import"
echo "money_movement=false"
echo "validator_mutation=false"

echo
echo "=== [1] Precision source/UI markers ==="
git log --oneline -5
git tag --points-at HEAD
git status --short

test -f "$HTML"
expect_grep "import share url marker" "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1" "$HTML"
expect_grep "peer import marker" "VOID_DATANET_DEMO_PEER_IMPORT_UI_V1" "$HTML"
expect_grep "share parser function" "function quickParseShareUrl" "$HTML"
expect_grep "share import function" "function quickImportFromShareUrl" "$HTML"
expect_grep "peer import route" "/datanet/v1/import-from-peer" "$HTML"

echo
echo "=== [2] Precision ready and served UI ==="
curl -fsS --max-time 15 "$PRECISION_LOCAL/__void/ready.json" > "$OUT/precision-ready.json"
cat "$OUT/precision-ready.json"
echo

curl -fsS --max-time 20 "$PRECISION_LOCAL/datanet-demo" > "$OUT/precision-datanet-demo.html"
expect_grep "served import share marker" "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1" "$OUT/precision-datanet-demo.html"
expect_grep "served share import function" "function quickImportFromShareUrl" "$OUT/precision-datanet-demo.html"

echo
echo "=== [3] publish source dataset on Precision ==="
PLAINTEXT="VOID_DATANET_DEMO_IMPORT_SHARE_URL_TWO_BOX_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "%s" "$PLAINTEXT" > "$OUT/plain.txt"
PLAIN_B64="$(base64 -w0 "$OUT/plain.txt")"

python3 - "$PLAIN_B64" "$WHO" > "$OUT/payload.json" <<'PY'
import json, sys
print(json.dumps({
  "name": "datanet-demo-import-share-url-two-box-proof.txt",
  "mime": "text/plain",
  "plaintext_b64": sys.argv[1],
  "who": sys.argv[2],
}))
PY

curl -fsS --max-time 40 \
  -H "content-type: application/json" \
  -X POST \
  --data @"$OUT/payload.json" \
  "$PRECISION_LOCAL/datanet/v1/publish?who=$WHO" > "$OUT/precision-publish.json"

python3 - "$OUT/precision-publish.json" "$OUT/dataset-id.txt" <<'PY'
import json, pathlib, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
dataset = j.get("id") or j.get("dataset_id") or j.get("datasetId")
assert dataset, j
pathlib.Path(sys.argv[2]).write_text(str(dataset))
print("[ok] precision dataset=" + str(dataset))
print("[ok] merkleRootHex=" + str(j.get("merkleRootHex") or ""))
print("[ok] sizeBytes=" + str(j.get("sizeBytes") or ""))
PY

DATASET_ID="$(cat "$OUT/dataset-id.txt")"
SHARE_URL="$PRECISION_TAILNET/datanet-demo?id=$DATASET_ID&who=$WHO"

echo "[ok] share_url=$SHARE_URL"

echo
echo "=== [4] verify Precision tailnet fetch ==="
curl -fsS --max-time 40 "$PRECISION_TAILNET/datanet/v1/fetch/$DATASET_ID?who=$WHO" > "$OUT/precision-tailnet-fetch.json"

python3 - "$OUT/precision-tailnet-fetch.json" "$DATASET_ID" "$OUT/plain.txt" <<'PY'
import base64, json, sys
j=json.load(open(sys.argv[1]))
dataset=sys.argv[2]
expected=open(sys.argv[3], "rb").read()
assert j.get("ok") is True, j
assert str(j.get("id") or "") == dataset, j
b64 = j.get("plaintext_b64") or j.get("cipher_b64") or ""
assert b64, j
assert base64.b64decode(b64) == expected, j
print("[ok] precision tailnet fetch bytes matched")
PY

echo
echo "=== [5] Alienware parse share URL, import from Precision, fetch local ==="
ssh "$ALIEN" "bash -s" <<REMOTE > "$OUT/alien-share-import.log"
set -euo pipefail
cd "\$HOME/dev/void-node" || exit 1

BASE="http://127.0.0.1:4100"
SHARE_URL="$SHARE_URL"
EXPECTED_DATASET="$DATASET_ID"
EXPECTED_WHO="$WHO"

echo "--- alien git truth ---"
git log --oneline -5
git tag --points-at HEAD
git status --short

echo "--- alien source/served markers ---"
grep -q "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1" public/demo/datanet/index.html
grep -q "function quickParseShareUrl" public/demo/datanet/index.html
grep -q "function quickImportFromShareUrl" public/demo/datanet/index.html
curl -fsS --max-time 20 "\$BASE/datanet-demo" > /tmp/datanet-demo-share-url-two-box-page.html
grep -q "VOID_DATANET_DEMO_IMPORT_SHARE_URL_UI_V1" /tmp/datanet-demo-share-url-two-box-page.html
grep -q "function quickImportFromShareUrl" /tmp/datanet-demo-share-url-two-box-page.html
echo "[ok] alien UI markers served"

echo "--- alien ready ---"
curl -fsS --max-time 15 "\$BASE/__void/ready.json"
echo

TMP="/tmp/datanet-demo-import-share-url-two-box-\$EXPECTED_DATASET"
mkdir -p "\$TMP"

python3 - "\$SHARE_URL" "\$EXPECTED_DATASET" "\$EXPECTED_WHO" "\$TMP/parsed.json" <<'PY'
from urllib.parse import urlparse, parse_qs
import json, pathlib, sys

share, expected_dataset, expected_who, out = sys.argv[1:5]
u = urlparse(share)
peer_http = f"{u.scheme}://{u.netloc}"
q = parse_qs(u.query)
dataset = (q.get("id") or q.get("dataset_id") or q.get("datasetId") or [""])[0]
source_who = (q.get("who") or ["datanet-demo-ui"])[0]

assert dataset == expected_dataset, (dataset, expected_dataset)
assert source_who == expected_who, (source_who, expected_who)

obj = {
  "peer_http": peer_http,
  "dataset_id": dataset,
  "who": expected_who,
  "source_who": source_who,
}
pathlib.Path(out).write_text(json.dumps(obj))
print("[ok] parsed peer_http=" + peer_http)
print("[ok] parsed dataset_id=" + dataset)
print("[ok] parsed source_who=" + source_who)
PY

echo "--- alien import from parsed share URL ---"
curl -fsS --max-time 60 \
  -H "content-type: application/json" \
  -X POST \
  --data @"\$TMP/parsed.json" \
  "\$BASE/datanet/v1/import-from-peer?who=\$EXPECTED_WHO" | tee "\$TMP/import.json"
echo

echo "--- alien local fetch after import ---"
curl -fsS --max-time 40 "\$BASE/datanet/v1/fetch/\$EXPECTED_DATASET?who=\$EXPECTED_WHO" | tee "\$TMP/fetch.json"
echo

python3 - "\$TMP/import.json" "\$TMP/fetch.json" "\$EXPECTED_DATASET" <<'PY'
import json, sys
imp=json.load(open(sys.argv[1]))
fet=json.load(open(sys.argv[2]))
dataset=sys.argv[3]

assert imp.get("ok") is True, imp
assert imp.get("marker") == "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1", imp
assert imp.get("dataset_id") == dataset, imp
assert imp.get("imported") is True, imp
assert imp.get("local_fetch_ok") is True, imp
assert imp.get("id_match") is True, imp

assert fet.get("ok") is True, fet
assert str(fet.get("id") or "") == dataset, fet

print("[ok] alien import/fetch json verified")
PY

echo "VOID_DATANET_DEMO_IMPORT_SHARE_URL_TWO_BOX_V1_GREEN"
echo "dataset_id=\$EXPECTED_DATASET"
echo "share_url=\$SHARE_URL"
REMOTE

cat "$OUT/alien-share-import.log"

echo
echo "=== [6] final marker check ==="
grep -q "VOID_DATANET_DEMO_IMPORT_SHARE_URL_TWO_BOX_V1_GREEN" "$OUT/alien-share-import.log"
grep -q "$DATASET_ID" "$OUT/alien-share-import.log"

echo "VOID_DATANET_DEMO_IMPORT_SHARE_URL_TWO_BOX_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "share_url=$SHARE_URL"
echo "out=$OUT"
