#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/datanet-demo-detail-url-autoload-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== DataNet demo detail URL autoload proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=datanet_demo_detail_url_autoload_proof"
echo "money_movement=false"
echo "validator_mutation=false"
echo

expect_grep() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if grep -Fq "$pattern" "$file"; then
    echo "[ok] $label"
  else
    echo "[fail] missing $label pattern=$pattern file=$file" >&2
    exit 1
  fi
}

echo "=== [1] source markers ==="
expect_grep "autoload marker" "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_V1" public/demo/datanet/index.html
expect_grep "autoload call marker" "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_CALL_V1" public/demo/datanet/index.html
expect_grep "detail URL param" 'params.get("detail")' public/demo/datanet/index.html
expect_grep "fallback id URL param" 'params.get("id")' public/demo/datanet/index.html
expect_grep "loadObjectDetail autoload call" "loadObjectDetail(clean)" public/demo/datanet/index.html
expect_grep "object detail panel still present" "VOID_DATANET_DEMO_OBJECT_DETAIL_PANEL_V1" public/demo/datanet/index.html
expect_grep "object detail renderer still present" "VOID_DATANET_DEMO_OBJECT_DETAIL_RENDER_V1" public/demo/datanet/index.html
echo

echo "=== [2] live readiness ==="
curl -fsS --max-time 10 "$BASE/health" | tee "$OUT/health.json"
python3 - "$OUT/health.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert int(j.get("http", 0)) == 4100, j
print("[ok] health/http live")
PY
echo

echo "=== [3] status smoke backstop ==="
BASE="$BASE" make mainnet0-status-smoke
echo

echo "=== [4] served autoload contract ==="
curl -fsS --max-time 20 "$BASE/datanet-demo" > "$OUT/datanet-demo.html"
expect_grep "served autoload marker" "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_V1" "$OUT/datanet-demo.html"
expect_grep "served autoload call marker" "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_CALL_V1" "$OUT/datanet-demo.html"
expect_grep "served detail URL param" 'params.get("detail")' "$OUT/datanet-demo.html"
expect_grep "served loadObjectDetail autoload call" "loadObjectDetail(clean)" "$OUT/datanet-demo.html"
expect_grep "served detail panel marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_PANEL_V1" "$OUT/datanet-demo.html"
expect_grep "served detail renderer marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_RENDER_V1" "$OUT/datanet-demo.html"
echo

echo "=== [5] publish object for detail URL ==="
PLAINTEXT="VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

python3 - "$BASE" "$PLAINTEXT" "$OUT/publish.json" <<'PY'
import base64, json, sys, urllib.request
base, plaintext, out = sys.argv[1], sys.argv[2], sys.argv[3]
body=json.dumps({
  "who": "datanet-demo-detail-url-autoload-proof",
  "name": "detail-url-autoload-proof.txt",
  "mime": "text/plain",
  "plaintext_b64": base64.b64encode(plaintext.encode()).decode()
}).encode()
req=urllib.request.Request(
  base + "/datanet/v1/publish?who=datanet-demo-detail-url-autoload-proof",
  data=body,
  headers={"content-type":"application/json"}
)
with urllib.request.urlopen(req, timeout=40) as r:
    j=json.loads(r.read().decode())
open(out, "w").write(json.dumps(j, indent=2, sort_keys=True))
did=j.get("dataset_id") or j.get("id")
assert j.get("ok") is True and did, j
print("[ok] published dataset=" + did)
print("[ok] root=" + str(j.get("merkleRootHex") or ""))
PY

DATASET_ID="$(python3 - "$OUT/publish.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("dataset_id") or j.get("id") or "")
PY
)"

if [ -z "$DATASET_ID" ]; then
  echo "[fail] empty dataset id" >&2
  exit 1
fi
echo "dataset_id=$DATASET_ID"
echo

echo "=== [6] backend detail route still works ==="
curl -fsS --max-time 40 "$BASE/datanet/v1/object/$DATASET_ID" > "$OUT/detail.json"
python3 - "$OUT/detail.json" "$DATASET_ID" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
did=sys.argv[2]
assert j.get("ok") is True, j
assert j.get("marker") == "VOID_DATANET_PUBLISH_SHIM_OBJECT_DETAIL_ROUTE_V1", j
assert j.get("dataset_id") == did or j.get("id") == did, j
path=j.get("object_detail_path") or ""
assert path.startswith("/datanet-demo?detail="), j
assert did in path, j
print("[ok] detail route returned object_detail_path=" + path)
PY
echo

echo "=== [7] detail URL serves autoload-capable page ==="
DETAIL_PATH="/datanet-demo?detail=$DATASET_ID&who=datanet-demo-detail-url-autoload-proof"
curl -fsS --max-time 20 "$BASE$DETAIL_PATH" > "$OUT/detail-url.html"
expect_grep "detail URL serves autoload marker" "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_V1" "$OUT/detail-url.html"
expect_grep "detail URL serves autoload call marker" "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_CALL_V1" "$OUT/detail-url.html"
expect_grep "detail URL serves object detail panel" "VOID_DATANET_DEMO_OBJECT_DETAIL_PANEL_V1" "$OUT/detail-url.html"
expect_grep "detail URL serves object detail renderer" "VOID_DATANET_DEMO_OBJECT_DETAIL_RENDER_V1" "$OUT/detail-url.html"
expect_grep "detail URL contract reads detail param" 'params.get("detail")' "$OUT/detail-url.html"
expect_grep "detail URL contract calls loadObjectDetail" "loadObjectDetail(clean)" "$OUT/detail-url.html"
echo "[ok] detail URL=$DETAIL_PATH"
echo

echo "VOID_DATANET_DEMO_DETAIL_URL_AUTOLOAD_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "out=$OUT"
