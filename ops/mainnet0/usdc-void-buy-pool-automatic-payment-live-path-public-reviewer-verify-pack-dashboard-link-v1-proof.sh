#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1"
public_node_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1"
buy_pool_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1"
doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-dashboard-link-v1.md"
src="src/index.ts"
pack_html="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1"
pack_json="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json"

echo "${marker}_LIVE_ROUTE_REPAIR_PROOF_BEGIN"

test -f "$doc"
test -f "$src"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$src"
grep -Fq "$public_node_marker" "$doc"
grep -Fq "$public_node_marker" "$src"
grep -Fq "$buy_pool_marker" "$doc"
grep -Fq "$buy_pool_marker" "$src"
grep -Fq "$pack_html" "$doc"
grep -Fq "$pack_html" "$src"
grep -Fq "$pack_json" "$doc"
grep -Fq "$pack_json" "$src"

echo "automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_doc_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_src_markers_green=true"
echo "automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_pack_links_green=true"

python3 - "$src" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()

overall = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1"
public_node_marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1"
buy_pool_marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1"
pack_html = "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1"
pack_json = "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json"

def require(cond, msg):
    if not cond:
        raise SystemExit(msg)

require(s.count(f'data-void-card="{public_node_marker}"') == 1, "public node card section must appear exactly once")
require(s.count(f'data-void-card="{buy_pool_marker}"') == 1, "buy pool card section must appear exactly once")

public_start = s.find('APP.get("/public-node",')
require(public_start >= 0, 'live APP.get("/public-node", route missing')
public_end = s.find("</body>", public_start)
require(public_end >= 0, "public node route body end missing")
public_window = s[public_start:public_end]

buy_starts = [
    i for i in [
        s.find('APP.get("/public-node/buy-pool/usdc-void-v1"'),
        s.find('app.get("/public-node/buy-pool/usdc-void-v1"'),
        s.find('runtimeApp.get("/public-node/buy-pool/usdc-void-v1"'),
    ] if i >= 0
]
require(buy_starts, "buy pool html route handler missing")
buy_start = min(buy_starts)
buy_end = s.find("</body>", buy_start)
require(buy_end >= 0, "buy pool route body end missing")
buy_window = s[buy_start:buy_end]

for marker, window, name in [
    (public_node_marker, public_window, "public-node"),
    (buy_pool_marker, buy_window, "buy-pool"),
]:
    require(f'data-void-card="{marker}"' in window, "%s card section missing from live %s route" % (marker, name))
    require(pack_html in window, "pack html link missing from live %s route" % name)
    require(pack_json in window, "pack json link missing from live %s route" % name)
    require(overall in window, "overall marker missing from live %s route" % name)

print("automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_live_route_body_green=true")
PY

if grep -E 'app\.(post|put|patch|delete)\("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack' "$src"; then
  echo "unexpected mutation route for reviewer pack dashboard link" >&2
  exit 1
fi

echo "automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_read_only_green=true"

if [ "${VOID_LIVE_CHECK:-0}" = "1" ]; then
  base="${VOID_PUBLIC_BASE:-http://127.0.0.1:4100}"
  tmp="$(mktemp -d)"
  curl -fsS "$base/public-node" > "$tmp/public-node.html"
  curl -fsS "$base/public-node/buy-pool/usdc-void-v1" > "$tmp/buy-pool.html"
  grep -Fq "$public_node_marker" "$tmp/public-node.html"
  grep -Fq "$buy_pool_marker" "$tmp/buy-pool.html"
  grep -Fq "$pack_html" "$tmp/public-node.html"
  grep -Fq "$pack_html" "$tmp/buy-pool.html"
  echo "automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_live_check_green=true"
else
  echo "automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_live_check_skipped=true"
fi

echo "${marker}_LIVE_ROUTE_REPAIR_GREEN"
