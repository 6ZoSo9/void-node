#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1"
route_index_wiring_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_ROUTE_INDEX_WIRING_V1"
doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-closeout-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-closeout-v1.json"
src="src/index.ts"

closeout_json="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1.json"
closeout_html="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1"
reviewer_pack_json="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json"
reviewer_pack_html="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$src"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$src"
grep -Fq "$route_index_wiring_marker" "$doc"
grep -Fq "$route_index_wiring_marker" "$fixture"
grep -Fq "$route_index_wiring_marker" "$src"
grep -Fq "$closeout_json" "$src"
grep -Fq "$closeout_html" "$src"
grep -Fq "$reviewer_pack_json" "$src"
grep -Fq "$reviewer_pack_html" "$src"

echo "automatic_payment_live_path_public_reviewer_closeout_doc_green=true"
echo "automatic_payment_live_path_public_reviewer_closeout_fixture_green=true"
echo "automatic_payment_live_path_public_reviewer_closeout_src_marker_green=true"
echo "automatic_payment_live_path_public_reviewer_closeout_route_index_wiring_marker_green=true"

python3 - "$fixture" <<'PY'
import json
import sys

j = json.load(open(sys.argv[1]))

def require(cond, msg):
    if not cond:
        raise SystemExit(msg)

require(j.get("marker") == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1", "bad marker")
require(j.get("status") == "public_reviewer_discovery_closeout_read_only", "bad status")
require(j.get("visibility") == "public", "bad visibility")
require(j.get("public_safe") is True, "public_safe must be true")
require(j.get("private_details_exposed") is False, "private_details_exposed must be false")
require(j.get("sealed_dependency_head") == "fa25742f", "bad sealed_dependency_head")

for key in [
    "closeout_json",
    "closeout_html",
    "reviewer_pack_json",
    "reviewer_pack_html",
    "public_node_dashboard",
    "buy_pool_page",
    "route_index_json",
]:
    require(key in j["routes"], "missing route " + key)

for required in [
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_ROUTE_INDEX_WIRING_V1",
    "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1",
]:
    require(required in j["required_markers"], "missing required marker " + required)

for key, value in j["discoverability"].items():
    require(value is True, "discoverability " + key + " must be true")

for key, value in j["authority"].items():
    require(value is False, "authority " + key + " must be false")

print("automatic_payment_live_path_public_reviewer_closeout_json_semantics_green=true")
print("automatic_payment_live_path_public_reviewer_closeout_authority_false_green=true")
PY

python3 - "$src" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()

def require(cond, msg):
    if not cond:
        raise SystemExit(msg)

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1"
route_index_wiring_marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_ROUTE_INDEX_WIRING_V1"
closeout_json = "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1.json"
closeout_html = "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1"

require(s.count('app.get("' + closeout_json + '"') == 1, "closeout json route must appear once")
require(s.count('app.get("' + closeout_html + '"') == 1, "closeout html route must appear once")
import re
require(len(re.findall(r'path:\s*"' + re.escape(closeout_json) + r'"', s)) == 1, "closeout json route-index entry must appear once")
require(len(re.findall(r'path:\s*"' + re.escape(closeout_html) + r'"', s)) == 1, "closeout html route-index entry must appear once")
require(route_index_wiring_marker in s, "route-index wiring marker missing")
require(marker in s, "marker missing")
print("automatic_payment_live_path_public_reviewer_closeout_src_routes_green=true")
print("automatic_payment_live_path_public_reviewer_closeout_route_index_entries_green=true")
PY

if grep -E 'app\.(post|put|patch|delete)\("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout' "$src"; then
  echo "unexpected mutation route for public reviewer closeout" >&2
  exit 1
fi

echo "automatic_payment_live_path_public_reviewer_closeout_read_only_green=true"

if [ "${VOID_LIVE_CHECK:-0}" = "1" ]; then
  base="${VOID_PUBLIC_BASE:-http://127.0.0.1:4100}"
  tmp="$(mktemp -d)"
  curl -fsS "$base$closeout_json" > "$tmp/closeout.json"
  curl -fsS "$base$closeout_html" > "$tmp/closeout.html"
  curl -fsS "$base/public-node/route-index.json" > "$tmp/route-index.json"
  grep -Fq "$marker" "$tmp/closeout.json"
  grep -Fq "$marker" "$tmp/closeout.html"
  grep -Fq "$closeout_json" "$tmp/route-index.json"
  grep -Fq "$closeout_html" "$tmp/route-index.json"
  echo "automatic_payment_live_path_public_reviewer_closeout_live_check_green=true"
else
  echo "automatic_payment_live_path_public_reviewer_closeout_live_check_skipped=true"
fi

echo "${marker}_GREEN"
