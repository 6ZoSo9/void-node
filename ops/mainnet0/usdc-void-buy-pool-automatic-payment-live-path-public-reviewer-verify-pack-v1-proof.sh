#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1"
doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-v1.json"
src="src/index.ts"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$src"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$src"

echo "automatic_payment_live_path_public_reviewer_verify_pack_doc_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_fixture_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_src_marker_green=true"

python3 - "$fixture" <<'PYJSON'
import json
import sys

path = sys.argv[1]
j = json.load(open(path))

def require(cond, msg):
    if not cond:
        raise SystemExit(msg)

require(j.get("marker") == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1", "bad marker")
require(j.get("status") == "public_reviewer_verify_pack_read_only", "bad status")
require(j.get("visibility") == "public", "bad visibility")
require(j.get("public_safe") is True, "public_safe must be true")
require(j.get("private_details_exposed") is False, "private_details_exposed must be false")

for k, v in j.get("authority", {}).items():
    require(v is False, "authority %s must be false" % k)

blob = json.dumps(j, sort_keys=True)

for route in [
    "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json",
    "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1",
    "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json",
    "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json",
    "/public-node/route-index.json",
]:
    require(route in blob, "missing route %s" % route)

for required_marker in [
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_ROUTE_INDEX_WIRING_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1",
]:
    require(required_marker in blob, "missing marker %s" % required_marker)

require(
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1_REVIEWER_GREEN" in j.get("copy_paste_verify_command", ""),
    "copy command missing reviewer green marker",
)

print("automatic_payment_live_path_public_reviewer_verify_pack_python_semantics_green=true")
PYJSON

echo "automatic_payment_live_path_public_reviewer_verify_pack_json_semantics_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_authority_false_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_copy_command_green=true"

grep -Fq "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" "$src"
grep -Fq "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1" "$src"
grep -Fq "automatic payment live-path public reviewer verify pack JSON route-index entry" "$src"
grep -Fq "automatic payment live-path public reviewer verify pack HTML route-index entry" "$src"

echo "automatic_payment_live_path_public_reviewer_verify_pack_route_index_wiring_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_read_only_route_green=true"

if [ "${VOID_LIVE_CHECK:-0}" = "1" ]; then
  base="${VOID_PUBLIC_BASE:-http://127.0.0.1:4100}"
  tmp="$(mktemp -d)"
  curl -fsS "$base/public-node/route-index.json" > "$tmp/route-index.json"
  curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" > "$tmp/pack.json"
  curl -fsS "$base/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1" > "$tmp/pack.html"
  grep -Fq "$marker" "$tmp/pack.json"
  grep -Fq "$marker" "$tmp/pack.html"
  grep -Fq "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" "$tmp/route-index.json"
  echo "automatic_payment_live_path_public_reviewer_verify_pack_live_check_green=true"
else
  echo "automatic_payment_live_path_public_reviewer_verify_pack_live_check_skipped=true"
fi

echo "${marker}_GREEN"
