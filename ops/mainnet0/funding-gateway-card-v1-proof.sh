#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
doc="docs/public/public-node-funding-gateway-card-v1.md"

grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$src" >/dev/null
grep -F "publicNodeFundingGatewayCard" "$src" >/dev/null

grep -F 'href="/public-node/funding"' "$src" >/dev/null
grep -F 'href="/buy-void"' "$src" >/dev/null
grep -F 'href="/funding"' "$src" >/dev/null
grep -F 'href="/public-node/triad-seal-v1.json"' "$src" >/dev/null

grep -F "Automatic token delivery:" "$src" >/dev/null
grep -F "Wallet send from public page:" "$src" >/dev/null
grep -F "Money movement from public page:" "$src" >/dev/null
grep -F "Investment return promised:" "$src" >/dev/null
grep -F "Yield claim:" "$src" >/dev/null
grep -F "operator queues" "$src" >/dev/null
grep -F "treasury controls" "$src" >/dev/null

grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$src" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$src" >/dev/null

grep -F "VOID_FUNDING_GATEWAY_CARD_DOC_V1" "$doc" >/dev/null
grep -F "public_mutation=false" "$doc" >/dev/null
grep -F "money_movement_now=false" "$doc" >/dev/null
grep -F "wallet_send_now=false" "$doc" >/dev/null
grep -F "buy_void_fulfillment_now=false" "$doc" >/dev/null
grep -F "automatic_token_delivery=false" "$doc" >/dev/null
grep -F "investment_return_claim=false" "$doc" >/dev/null
grep -F "yield_claim=false" "$doc" >/dev/null
grep -F "operator_review_required=true" "$doc" >/dev/null

if grep -E 'APP\.post\("/public-node/funding"|app\.post\("/public-node/funding"' "$src" >/dev/null; then
  echo "unexpected public-node funding mutation route found" >&2
  exit 11
fi

echo "VOID_FUNDING_GATEWAY_CARD_V1_GREEN"
