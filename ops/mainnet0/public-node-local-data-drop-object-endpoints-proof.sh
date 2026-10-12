#!/usr/bin/env bash
set -euo pipefail

OBJECT_ID="${1:?usage: public-node-local-data-drop-object-endpoints-proof.sh OBJECT_ID SHA256}"
SHA="${2:?usage: public-node-local-data-drop-object-endpoints-proof.sh OBJECT_ID SHA256}"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"

SAFE_OBJECT_ID="${OBJECT_ID//[^A-Za-z0-9._-]/_}"
OBJ="/tmp/void-local-data-drop-${SAFE_OBJECT_ID}-object.txt"
BYSHA="/tmp/void-local-data-drop-${SAFE_OBJECT_ID}-by-sha.txt"
PROOF_JSON="/tmp/void-local-data-drop-${SAFE_OBJECT_ID}-proof.json"

echo "=== VOID Public Node Local Data Drop Object Endpoints Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"
echo "object_id=$OBJECT_ID"
echo "sha256=$SHA"

curl -fsS "$BASE/public-node/local-data-drop/$OBJECT_ID" -o "$OBJ"
curl -fsS "$BASE/public-node/local-data-drop/by-sha256/$SHA" -o "$BYSHA"
curl -fsS "$BASE/public-node/local-data-drop/proof/$SHA.json" -o "$PROOF_JSON"

cmp -s "$OBJ" "$BYSHA"

OBJ_SHA="$(sha256sum "$OBJ" | awk '{print $1}')"
BYSHA_SHA="$(sha256sum "$BYSHA" | awk '{print $1}')"

test "$OBJ_SHA" = "$SHA"
test "$BYSHA_SHA" = "$SHA"

python3 - "$OBJECT_ID" "$SHA" "$PROOF_JSON" <<'PY'
import json
import sys

object_id, sha, path = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(path, encoding="utf-8"))

checks = {
    "object_id": object_id,
    "sha256": sha,
    "receipt_sha256": sha,
}

for key, expected in checks.items():
    if data.get(key) != expected:
        raise SystemExit(f"bad {key}: {data.get(key)!r}")

for key in ["object_href", "content_address_href", "proof_href"]:
    value = data.get(key, "")
    if not value:
        raise SystemExit(f"missing {key}")

if object_id not in data.get("object_href", ""):
    raise SystemExit("object_href missing object_id")

if sha not in data.get("content_address_href", ""):
    raise SystemExit("content_address_href missing sha")

if sha not in data.get("proof_href", ""):
    raise SystemExit("proof_href missing sha")

print("object_endpoint_json_verified=true")
PY

echo "object_sha=$OBJ_SHA"
echo "by_sha_sha=$BYSHA_SHA"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1_GREEN"
