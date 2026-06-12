#!/usr/bin/env bash
set -euo pipefail

SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
BASE="${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
DOC="docs/public/public-node-local-data-drop-live-import-demo-002-status.md"

OBJ="/tmp/demo002-endpoint-object.txt"
BYSHA="/tmp/demo002-endpoint-by-sha.txt"
PROOF_JSON="/tmp/demo002-endpoint-proof.json"

echo "=== VOID Public Node Local Data Drop Demo 002 Public Endpoints Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"

test -f "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_PUBLIC_ENDPOINTS_V1" "$DOC"

curl -fsS "$BASE/public-node/local-data-drop/live-import-demo-002.txt" -o "$OBJ"
curl -fsS "$BASE/public-node/local-data-drop/by-sha256/$SHA" -o "$BYSHA"
curl -fsS "$BASE/public-node/local-data-drop/proof/$SHA.json" -o "$PROOF_JSON"

cmp -s "$OBJ" "$BYSHA"

OBJ_SHA="$(sha256sum "$OBJ" | awk '{print $1}')"
BYSHA_SHA="$(sha256sum "$BYSHA" | awk '{print $1}')"

test "$OBJ_SHA" = "$SHA"
test "$BYSHA_SHA" = "$SHA"

python3 - <<'PY'
import json

sha = "264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
path = "/tmp/demo002-endpoint-proof.json"

data = json.load(open(path, encoding="utf-8"))

checks = {
    "object_id": "live-import-demo-002.txt",
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

if sha not in data["content_address_href"]:
    raise SystemExit("content_address_href missing sha")

if sha not in data["proof_href"]:
    raise SystemExit("proof_href missing sha")

print("demo_002_public_endpoint_json_verified=true")
PY

echo "object_sha=$OBJ_SHA"
echo "by_sha_sha=$BYSHA_SHA"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_PUBLIC_ENDPOINTS_V1_GREEN"
