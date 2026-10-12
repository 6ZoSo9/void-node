#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/datanet-demo-object-detail-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== DataNet demo object detail proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "mutation=datanet_demo_object_detail_proof"
echo "money_movement=false"
echo "validator_mutation=false"
echo

expect_grep() {
  local label="$1"
  local pattern="$2"
  local file="$3"
  if ! grep -Fq "$pattern" "$file"; then
    echo "[fail] missing $label: $pattern in $file" >&2
    exit 1
  fi
  echo "[ok] $label"
}

echo "=== [1] source markers ==="
expect_grep "object detail backend marker" "VOID_DATANET_PUBLISH_SHIM_OBJECT_DETAIL_ROUTE_V1" src/index.ts
expect_grep "object detail route path" "/datanet/v1/object/:id" src/index.ts
expect_grep "object detail panel marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_PANEL_V1" public/demo/datanet/index.html
expect_grep "object detail renderer marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_RENDER_V1" public/demo/datanet/index.html
expect_grep "view details action" 'data-action="details"' public/demo/datanet/index.html
expect_grep "object detail fetch path" "/datanet/v1/object/" public/demo/datanet/index.html
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

echo "=== [2b] status smoke backstop ==="
make mainnet0-status-smoke
echo

echo "=== [3] served UI markers ==="
curl -fsS --max-time 20 "$BASE/datanet-demo" > "$OUT/datanet-demo.html"
expect_grep "served detail panel marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_PANEL_V1" "$OUT/datanet-demo.html"
expect_grep "served detail renderer marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_RENDER_V1" "$OUT/datanet-demo.html"
expect_grep "served view details action" 'data-action="details"' "$OUT/datanet-demo.html"
expect_grep "served detail fetch path" "/datanet/v1/object/" "$OUT/datanet-demo.html"
echo

echo "=== [4] publish source object ==="
PLAINTEXT="VOID_DATANET_DEMO_OBJECT_DETAIL_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

python3 - "$BASE" "$PLAINTEXT" "$OUT/publish.json" <<'PY'
import base64, json, sys, urllib.error, urllib.request

base, plaintext, out = sys.argv[1], sys.argv[2], sys.argv[3]
url = base + "/datanet/v1/publish?who=datanet-demo-object-detail-proof"

payloads = [
  {
    "who": "datanet-demo-object-detail-proof",
    "name": "object-detail-proof.txt",
    "mime": "text/plain",
    "plaintext": plaintext
  },
  {
    "who": "datanet-demo-object-detail-proof",
    "name": "object-detail-proof.txt",
    "mime": "text/plain",
    "text": plaintext
  },
  {
    "who": "datanet-demo-object-detail-proof",
    "name": "object-detail-proof.txt",
    "mime": "text/plain",
    "content": plaintext
  },
  {
    "account": "datanet-demo-object-detail-proof",
    "who": "datanet-demo-object-detail-proof",
    "name": "object-detail-proof.txt",
    "mime": "text/plain",
    "plaintext": plaintext
  },
  {
    "who": "datanet-demo-object-detail-proof",
    "name": "object-detail-proof.txt",
    "mime": "text/plain",
    "plaintext_b64": base64.b64encode(plaintext.encode()).decode()
  },
]

last = None

for idx, payload in enumerate(payloads, 1):
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            raw = r.read().decode()
            j = json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        last = {"ok": False, "variant": idx, "http_status": e.code, "http_body": raw}
        continue
    except Exception as e:
        last = {"ok": False, "variant": idx, "error": str(e)}
        continue

    did = j.get("dataset_id") or j.get("id")
    if j.get("ok") is True and did:
        j["_publish_payload_variant"] = idx
        open(out, "w").write(json.dumps(j, indent=2, sort_keys=True))
        print("[ok] published dataset=" + str(did))
        print("[ok] publish_payload_variant=" + str(idx))
        print("[ok] root=" + str(j.get("merkleRootHex") or ""))
        print("[ok] size=" + str(j.get("sizeBytes") or ""))
        raise SystemExit(0)

    last = {"ok": False, "variant": idx, "response": j}

open(out, "w").write(json.dumps(last or {"ok": False, "error": "no_publish_attempt"}, indent=2, sort_keys=True))
print("[fail] publish failed; wrote " + out, file=sys.stderr)
print(json.dumps(last, indent=2, sort_keys=True), file=sys.stderr)
raise SystemExit(1)
PY

DATASET_ID="$(python3 - "$OUT/publish.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("dataset_id") or j.get("id") or "")
PY
)"

if [ -z "$DATASET_ID" ]; then
  echo "[fail] missing dataset id" >&2
  exit 1
fi
echo

echo "=== [5] fetch object detail route ==="
curl -fsS --max-time 40 "$BASE/datanet/v1/object/$DATASET_ID" > "$OUT/detail.json"
python3 - "$OUT/detail.json" "$DATASET_ID" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
did=sys.argv[2]
assert j.get("ok") is True, j
assert j.get("marker") == "VOID_DATANET_PUBLISH_SHIM_OBJECT_DETAIL_ROUTE_V1", j
assert j.get("dataset_id") == did or j.get("id") == did, j
assert int(j.get("sizeBytes") or 0) > 0, j
assert j.get("merkleRootHex"), j
assert j.get("local_fetch_url"), j
assert j.get("share_url_path"), j
assert j.get("object_detail_path"), j
assert "preview" in j, j
print("[ok] object detail marker/dataset/root/size/links/preview verified")
print("[ok] object_detail_path=" + str(j.get("object_detail_path")))
PY
echo

echo "=== [6] detail URL page still serves demo shell ==="
DETAIL_PATH="$(python3 - "$OUT/detail.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("object_detail_path") or "")
PY
)"
curl -fsS --max-time 20 "$BASE$DETAIL_PATH" > "$OUT/detail-page.html"
expect_grep "detail URL serves demo shell marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_PANEL_V1" "$OUT/detail-page.html"
expect_grep "detail URL serves renderer marker" "VOID_DATANET_DEMO_OBJECT_DETAIL_RENDER_V1" "$OUT/detail-page.html"
echo

echo "=== [7] verify existing object browser/fetch still works ==="
curl -fsS --max-time 40 "$BASE/datanet/v1/objects?limit=25" > "$OUT/objects.json"
python3 - "$OUT/objects.json" "$DATASET_ID" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
did=sys.argv[2]
assert j.get("ok") is True, j
items=j.get("items") or []
hit=next((x for x in items if x.get("dataset_id")==did or x.get("id")==did), None)
assert hit, j
assert hit.get("share_url_path"), hit
print("[ok] object browser still lists dataset=" + did)
PY

curl -fsS --max-time 40 "$BASE/datanet/v1/fetch/$DATASET_ID?who=datanet-demo-object-detail-proof" > "$OUT/fetch.json"
python3 - "$OUT/fetch.json" "$PLAINTEXT" <<'PY'
import base64, json, sys
j=json.load(open(sys.argv[1]))
plain=sys.argv[2]
raw=json.dumps(j)
assert j.get("ok") is True, j

decoded = ""
for key in ("plaintext", "text", "content"):
    if isinstance(j.get(key), str):
        decoded = j[key]
        break

if not decoded and isinstance(j.get("cipher_b64"), str):
    decoded = base64.b64decode(j["cipher_b64"]).decode("utf-8")

if not decoded and isinstance(j.get("plaintext_b64"), str):
    decoded = base64.b64decode(j["plaintext_b64"]).decode("utf-8")

assert plain in raw or decoded == plain or plain in decoded, j
print("[ok] fetch still returns published payload")
PY
echo

echo "VOID_DATANET_DEMO_OBJECT_DETAIL_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "out=$OUT"
