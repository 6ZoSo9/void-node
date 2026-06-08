#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/datanet-demo-share-open-by-id-ui-proof-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-datanet-demo-ui-proof}"

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

echo "=== DataNet demo share/open-by-id UI proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=false"
echo "money_movement=false"
echo "validator_mutation=false"

echo
echo "=== [1] static UI markers ==="
test -f "$HTML"
expect_grep "share/open marker" "VOID_DATANET_DEMO_SHARE_OPEN_BY_ID_UI_V1" "$HTML"
expect_grep "dataset id input" "quickDatasetIdInput" "$HTML"
expect_grep "share url field" "quickShareUrl" "$HTML"
expect_grep "open by id function" "function quickOpenDatasetById" "$HTML"
expect_grep "copy share link function" "function quickCopyShareLink" "$HTML"
expect_grep "autoload shared dataset function" "function quickAutoloadSharedDataset" "$HTML"
expect_grep "query dataset parser" "quickDatasetIdFromLocation" "$HTML"
expect_grep "share url builder" "quickShareUrlFor" "$HTML"
expect_grep "store/fetch base marker" "VOID_DATANET_DEMO_TEXT_STORE_FETCH_UI_V1" "$HTML"

echo
echo "=== [2] publish dataset for share/open proof ==="
PLAINTEXT="VOID_DATANET_DEMO_SHARE_OPEN_BY_ID_UI_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "%s" "$PLAINTEXT" > "$OUT/plain.txt"
PLAIN_B64="$(base64 -w0 "$OUT/plain.txt")"

python3 - "$PLAIN_B64" "$WHO" > "$OUT/payload.json" <<'PY'
import json, sys
print(json.dumps({
  "name": "datanet-demo-share-open-by-id-ui-proof.txt",
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
dataset = j.get("id") or j.get("dataset_id") or j.get("datasetId") or j.get("root") or j.get("content_root")
assert dataset, j
pathlib.Path(sys.argv[2]).write_text(str(dataset))
print("[ok] published dataset=" + str(dataset))
print("[ok] merkleRootHex=" + str(j.get("merkleRootHex") or ""))
print("[ok] sizeBytes=" + str(j.get("sizeBytes") or ""))
PY

DATASET_ID="$(cat "$OUT/dataset-id.txt")"
SHARE_URL="$BASE/datanet-demo?id=$DATASET_ID&who=$WHO"

echo
echo "=== [3] served share URL page markers ==="
curl -fsS --max-time 20 "$SHARE_URL" > "$OUT/share-page.html"
expect_grep "served share/open marker" "VOID_DATANET_DEMO_SHARE_OPEN_BY_ID_UI_V1" "$OUT/share-page.html"
expect_grep "served open by id function" "function quickOpenDatasetById" "$OUT/share-page.html"
expect_grep "served copy share link function" "function quickCopyShareLink" "$OUT/share-page.html"
expect_grep "served autoload function" "function quickAutoloadSharedDataset" "$OUT/share-page.html"
expect_grep "served query parser" "quickDatasetIdFromLocation" "$OUT/share-page.html"

echo
echo "=== [4] fetch dataset from share/open proof ==="
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
decoded = base64.b64decode(b64)
assert decoded == expected, {"decoded": decoded.decode(errors="replace"), "expected": expected.decode()}
print("[ok] fetched dataset=" + dataset)
print("[ok] fetched text matched published text")
PY

echo
echo "VOID_DATANET_DEMO_SHARE_OPEN_BY_ID_UI_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "share_url=$SHARE_URL"
echo "out=$OUT"
