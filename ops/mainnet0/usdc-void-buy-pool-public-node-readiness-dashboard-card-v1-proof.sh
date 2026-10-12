#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-readiness-dashboard-card-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1" "$src" >/dev/null
grep -F 'id="usdcVoidBuyPoolReadinessDashboardCardV1"' "$src" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1" "$src" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$src" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$src" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$src" >/dev/null
grep -F "no automatic VOID delivery" "$src" >/dev/null
grep -F "no public fulfillment endpoint" "$src" >/dev/null
grep -F "no public wallet-send authority" "$src" >/dev/null
grep -F "no autonomous write authority" "$src" >/dev/null
grep -F "no private buyer/payment/operator packet/key/send material exposed" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path

s = Path("src/index.ts").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1"
route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1"

comment_marker = "<!-- " + marker + " -->"
comment_count = s.count(comment_marker)

if comment_count != 1:
    raise SystemExit(f"dashboard_card_html_comment_marker_count_not_one={comment_count}")

card_start = s.find(comment_marker)
if card_start < 0:
    raise SystemExit("dashboard_card_missing")

card_end = s.find("</div>", card_start)
if card_end < 0:
    raise SystemExit("dashboard_card_end_missing")

card = s[card_start:card_end]

for required in [
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1",
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json",
    "/public-node/buy-pool/usdc-void-v1",
    "/public-node/buy-pool/usdc-void-v1.json",
    "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1",
    "no automatic VOID delivery",
    "no public fulfillment endpoint",
    "no public wallet-send authority",
    "no autonomous write authority",
]:
    if required not in card:
        raise SystemExit(f"dashboard_card_missing_required_text={required}")

print("readiness_dashboard_card_source_green=true")
PY

if grep -F 'post("/public-node/usdc-void-buy-pool/readiness-rollup-v1' "$src" >/dev/null; then
  echo "readiness_rollup_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1_GREEN"
