#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/datanet-publish-shim-peer-import-proof-$(date +%Y%m%d-%H%M%S)}"
WHO="${WHO:-datanet-peer-import-proof}"
RUNTIME_SERVICE="${VOID_RUNTIME_SERVICE:-void-node.service}"

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

echo "=== DataNet publish-shim peer import proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "runtime_service=$RUNTIME_SERVICE"
echo "mutation=local_datanet_publish_shim_import"
echo "money_movement=false"
echo "validator_mutation=false"

echo
echo "=== [1] source markers ==="
expect_grep "route marker" "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1" src/index.ts
expect_grep "import route" "/datanet/v1/import-from-peer" src/index.ts
expect_grep "preserve requested id" "copiedToRequestedId" src/index.ts
expect_grep "copied field" "copied_to_requested_id" src/index.ts
expect_grep "import metadata" "imported_from_peer_v1" src/index.ts
expect_grep "requested id metadata" "peer_import_requested_id" src/index.ts

echo
echo "=== [2] build/restart/ready ==="
npm run build > "$OUT/build.log" 2>&1

if [ "${VOID_PROOF_SKIP_RESTART:-0}" = "1" ]; then
  echo "[ok] VOID_PROOF_SKIP_RESTART=1, using already-running runtime"
else
  systemctl --user restart "$RUNTIME_SERVICE"
  sleep 4
fi

curl -fsS --max-time 15 "$BASE/__void/ready.json" > "$OUT/ready.json"
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot verified")
PY

echo
echo "=== [3] publish source dataset ==="
PLAINTEXT="VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1 proof utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf "%s" "$PLAINTEXT" > "$OUT/plain.txt"
PLAIN_B64="$(base64 -w0 "$OUT/plain.txt")"

python3 - "$PLAIN_B64" "$WHO" > "$OUT/publish-payload.json" <<'PY'
import json, sys
print(json.dumps({
  "name": "datanet-publish-shim-peer-import-proof.txt",
  "mime": "text/plain",
  "plaintext_b64": sys.argv[1],
  "who": sys.argv[2],
}))
PY

curl -fsS --max-time 40 \
  -H "content-type: application/json" \
  -X POST \
  --data @"$OUT/publish-payload.json" \
  "$BASE/datanet/v1/publish?who=$WHO" > "$OUT/source-publish.json"

python3 - "$OUT/source-publish.json" "$OUT/dataset-id.txt" <<'PY'
import json, pathlib, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
dataset = j.get("id") or j.get("dataset_id") or j.get("datasetId")
assert dataset, j
pathlib.Path(sys.argv[2]).write_text(str(dataset))
print("[ok] source dataset=" + str(dataset))
print("[ok] source merkleRootHex=" + str(j.get("merkleRootHex") or ""))
print("[ok] source sizeBytes=" + str(j.get("sizeBytes") or ""))
PY

DATASET_ID="$(cat "$OUT/dataset-id.txt")"

echo
echo "=== [4] import source dataset through peer import route ==="
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
print("[ok] local_fetch_url=" + str(j.get("local_fetch_url")))
PY

echo
echo "=== [5] verify local fetch bytes after import ==="
curl -fsS --max-time 40 "$BASE/datanet/v1/fetch/$DATASET_ID?who=$WHO" > "$OUT/local-fetch.json"

python3 - "$OUT/local-fetch.json" "$DATASET_ID" "$OUT/plain.txt" <<'PY'
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
print("[ok] local fetch dataset=" + dataset)
print("[ok] local fetch bytes matched source")
PY

echo
echo "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1_GREEN"
echo "dataset_id=$DATASET_ID"
echo "out=$OUT"
