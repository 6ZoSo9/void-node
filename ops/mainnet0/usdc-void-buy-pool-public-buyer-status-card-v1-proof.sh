#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-buyer-status-card-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$doc" >/dev/null
grep -F "buy-pool quote is public-readable" "$doc" >/dev/null
grep -F "operator execution is manual" "$doc" >/dev/null
grep -F "no automatic VOID delivery" "$doc" >/dev/null
grep -F "no public fulfillment endpoint" "$doc" >/dev/null
grep -F "no public wallet-send authority" "$doc" >/dev/null
grep -F "no autonomous write authority" "$doc" >/dev/null
grep -F "does not expose private operator packets" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1" "$src" >/dev/null
grep -F "buyer-status-card" "$src" >/dev/null
grep -F "Buyer status" "$src" >/dev/null
grep -F "this buy-pool quote is public-readable" "$src" >/dev/null
grep -F "operator execution remains manual, gated, and withheld" "$src" >/dev/null
grep -F "No automatic VOID delivery is promised by this page." "$src" >/dev/null
grep -F "No public fulfillment endpoint is open." "$src" >/dev/null
grep -F "No public wallet-send authority is granted." "$src" >/dev/null
grep -F "No autonomous write authority is added." "$src" >/dev/null
grep -F "Private operator packets, buyer payment records, wallet keys, and send commands remain non-public." "$src" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
s = Path("src/index.ts").read_text()
route = 'app.get("/public-node/buy-pool/usdc-void-v1"'
start = s.find(route)
if start < 0:
    raise SystemExit("buy_pool_html_route_missing")
marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1"
m = s.find(marker, start)
if m < 0:
    raise SystemExit("buyer_status_card_not_inside_buy_pool_route_after_anchor")
next_route = s.find('app.get("', start + len(route))
if next_route >= 0 and m > next_route:
    raise SystemExit("buyer_status_card_appears_after_next_route")
print("buyer_status_card_inside_buy_pool_route=true")
PY

if grep -F 'app.post("/public-node/buy-pool/usdc-void-v1' "$src" >/dev/null; then
  echo "buy_pool_public_post_route_present=true"
  exit 1
fi

if grep -F 'sendTransaction' "$doc" "$src" | grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1" >/dev/null; then
  echo "buyer_status_card_wallet_send_language_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1_GREEN"
