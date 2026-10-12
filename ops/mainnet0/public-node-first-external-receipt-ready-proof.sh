#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
CELLULAR_TESTER_SHARE_LOADED="${CELLULAR_TESTER_SHARE_LOADED:-false}"
OUT="${OUT:-/tmp/public-node-first-external-receipt-ready-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_READY_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "cellular_tester_share_loaded=$CELLULAR_TESTER_SHARE_LOADED"
echo "out=$OUT"

test "$(systemctl --user is-active void-node-live.service)" = "active"
echo "service_active=true"

curl -fsS "$LOCAL_BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json"
curl -fsS "$LOCAL_BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"
curl -fsS "$LOCAL_BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json"
curl -fsS "$LOCAL_BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json"
curl -fsS "$LOCAL_BASE/public-node/tester-share" > "$OUT/tester-share.html"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_READY_V1" docs/public/public-node-first-external-receipt-ready.md
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1" "$OUT/tester-share.html"

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])

external = json.loads((out / "external-base-url.json").read_text())
pack = json.loads((out / "first-tester-request-copy-pack.json").read_text())
receipt = json.loads((out / "tester-result-receipt.json").read_text())
intake = json.loads((out / "tester-result-intake.json").read_text())

assert external["marker"] == "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1"
assert pack["marker"] == "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"
assert receipt["marker"] == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
assert intake["marker"] == "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"

base = external.get("effective_base_url")
assert base and base != "http://127.0.0.1:4100", "public base is not configured"

assert pack.get("effective_base_url") == base
assert pack.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert pack.get("expected_receipt_file") == "tester-receipt.json"
assert pack.get("tester_links", {}).get("tester_share_page", "").startswith(base)

intake_obj = intake.get("intake", {})
assert intake_obj.get("mode") == "operator_local_file_import_only"
assert intake_obj.get("public_post_endpoint") is False

for doc_name, doc in [("pack", pack), ("intake", intake)]:
    policy = doc.get("safety_boundary") or doc.get("policy") or {}
    assert policy.get("public_routes_only") is True, f"{doc_name} public_routes_only"
    assert policy.get("mutation") is False, f"{doc_name} mutation"
    assert policy.get("money_movement") is False, f"{doc_name} money_movement"
    assert policy.get("wallet_send") is False, f"{doc_name} wallet_send"
    assert policy.get("wc_to_void_swap") is False, f"{doc_name} wc_to_void_swap"
    assert policy.get("buy_void_fulfillment") is False, f"{doc_name} buy_void_fulfillment"
    assert policy.get("validator_mutation") is False, f"{doc_name} validator_mutation"

print("json_checks=green")
print(f"effective_base_url={base}")
print(f"tester_share_page={pack['tester_links']['tester_share_page']}")
print(f"intake_status={intake.get('status')}")
print(f"latest_imported={intake_obj.get('latest_imported')}")
PY

for p in \
  /public-node/tester-share \
  /public-node/first-tester-request-copy-pack.json \
  /public-node/tester-result-receipt.json \
  /public-node/tester-result-intake.json \
  /public-node/tester-lane-summary.json
do
  printf "%-70s" "$p"
  curl -fsS --max-time 8 -o /dev/null "$LOCAL_BASE$p"
  echo " OK"
done

if [ "$CELLULAR_TESTER_SHARE_LOADED" != "true" ]; then
  echo "ERROR: set CELLULAR_TESTER_SHARE_LOADED=true only after cellular tester-share loads."
  exit 1
fi

echo "ready_to_request_first_external_receipt=true"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_READY_PROOF_V1_GREEN"
