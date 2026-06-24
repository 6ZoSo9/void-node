#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1"
public_node_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1"
buy_pool_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1"
doc="docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-dashboard-link-v1.md"
src="src/index.ts"
pack_html="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1"
pack_json="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json"

echo "${marker}_PROOF_BEGIN"

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

checks = [
    ("VOID_PUBLIC_NODE_PROFILE_ROUTE_V1", "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1"),
    ("VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1", "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1"),
]

for anchor, marker in checks:
    a = s.find(anchor)
    if a < 0:
        raise SystemExit(f"missing anchor {anchor}")
    b = s.find("</body>", a)
    if b < 0:
        raise SystemExit(f"missing body close after {anchor}")
    window = s[a:b]
    if marker not in window:
        raise SystemExit(f"{marker} not inside route body for {anchor}")
    if "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1" not in window:
        raise SystemExit(f"reviewer pack html link not inside route body for {anchor}")
    if "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json" not in window:
        raise SystemExit(f"reviewer pack json link not inside route body for {anchor}")

print("automatic_payment_live_path_public_reviewer_verify_pack_dashboard_link_route_body_green=true")
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

echo "${marker}_GREEN"
