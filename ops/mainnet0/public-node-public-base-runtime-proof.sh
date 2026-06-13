#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
PUBLIC_NODE_BASE="${PUBLIC_NODE_BASE:-}"
CELLULAR_TESTER_SHARE_LOADED="${CELLULAR_TESTER_SHARE_LOADED:-false}"
OUT="${OUT:-/tmp/public-node-public-base-runtime-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_PUBLIC_BASE_RUNTIME_PROOF_SCRIPT_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "public_node_base=${PUBLIC_NODE_BASE:-unset}"
echo "cellular_tester_share_loaded=$CELLULAR_TESTER_SHARE_LOADED"
echo "out=$OUT"

test "$(systemctl --user is-active void-node-live.service)" = "active"
echo "service_active=true"

curl -fsS "$LOCAL_BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json"
curl -fsS "$LOCAL_BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"

python3 - "$OUT" "$PUBLIC_NODE_BASE" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])
expected_public = sys.argv[2].strip()

external = json.loads((out / "external-base-url.json").read_text())
pack = json.loads((out / "first-tester-request-copy-pack.json").read_text())

assert external["marker"] == "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1"
assert pack["marker"] == "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"

effective = external.get("effective_base_url")
pack_base = pack.get("effective_base_url")

assert effective and effective != "http://127.0.0.1:4100", "external effective base is still localhost"
assert pack_base == effective, "tester pack base does not match external effective base"

if expected_public:
    assert effective == expected_public, f"expected {expected_public}, got {effective}"

links = pack.get("tester_links", {})
assert links.get("tester_share_page", "").startswith(effective)
assert links.get("standalone_smoke_script", "").startswith(effective)
assert pack.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert pack.get("expected_receipt_file") == "tester-receipt.json"

print("json_public_base_checks=green")
print(f"effective_base_url={effective}")
print(f"tester_share_page={links.get('tester_share_page')}")
PY

for p in \
  /version \
  /public-node \
  /public-node/tester-share \
  /public-node/tester-lane-summary.json \
  /.well-known/void-public-node.json \
  /public-node/route-manifest.json \
  /public-node/self-check-snapshot.json \
  /public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json \
  /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html \
  /proofs
do
  printf "%-95s" "$p"
  curl -fsS --max-time 8 -o /dev/null "$LOCAL_BASE$p"
  echo " OK"
done

if [ "$CELLULAR_TESTER_SHARE_LOADED" != "true" ]; then
  echo "ERROR: set CELLULAR_TESTER_SHARE_LOADED=true only after phone/cellular tester-share loads."
  exit 1
fi

echo "manual_cellular_tester_share_loaded=true"
echo "VOID_PUBLIC_NODE_PUBLIC_BASE_RUNTIME_PROOF_SCRIPT_V1_GREEN"
