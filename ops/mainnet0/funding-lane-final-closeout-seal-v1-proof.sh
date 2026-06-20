#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
doc="docs/public/public-node-funding-lane-final-closeout-seal-v1.md"

grep -F "VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_DOC_V1" "$doc" >/dev/null
grep -F "7a94c508" "$doc" >/dev/null
grep -F "7a94c508cefc" "$doc" >/dev/null

grep -F "VOID_FUNDING_RUNTIME_ROUTE_V1" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$doc" >/dev/null
grep -F "VOID_FUNDING_PUBLIC_PROOF_PACK_ABORT_RECOVERY_SEAL_DOC_V1" "$doc" >/dev/null
grep -F "VOID_FUNDING_SAFE_PUBLIC_PACKET_DOC_V1" "$doc" >/dev/null
grep -F "VOID_FUNDING_SAFE_PUBLIC_PACKET_V1_GREEN" "$doc" >/dev/null

grep -F "runtime route added: false" "$doc" >/dev/null
grep -F "automatic token delivery" "$doc" >/dev/null
grep -F "public payment verification" "$doc" >/dev/null
grep -F "public treasury control" "$doc" >/dev/null
grep -F "public wallet send" "$doc" >/dev/null
grep -F "investment return" "$doc" >/dev/null
grep -F "yield" "$doc" >/dev/null

grep -F "public_read_only=true" "$doc" >/dev/null
grep -F "public_mutation=false" "$doc" >/dev/null
grep -F "money_movement_now=false" "$doc" >/dev/null
grep -F "wallet_send_now=false" "$doc" >/dev/null
grep -F "buy_void_fulfillment_now=false" "$doc" >/dev/null
grep -F "automatic_token_delivery=false" "$doc" >/dev/null
grep -F "public_fulfillment=false" "$doc" >/dev/null
grep -F "investment_return_claim=false" "$doc" >/dev/null
grep -F "profit_promise=false" "$doc" >/dev/null
grep -F "yield_claim=false" "$doc" >/dev/null
grep -F "wc_to_void_swap_now=false" "$doc" >/dev/null
grep -F "validator_mutation_now=false" "$doc" >/dev/null
grep -F "operator_queue_public=false" "$doc" >/dev/null
grep -F "treasury_controls_public=false" "$doc" >/dev/null
grep -F "admin_api_public=false" "$doc" >/dev/null
grep -F "private_keys_public=false" "$doc" >/dev/null

grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$src" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$src" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$src" >/dev/null

test -f docs/public/public-node-funding-safe-public-packet-v1.md
test -f docs/public/public-node-funding-public-proof-pack-abort-recovery-seal-v1.md
test -x ops/mainnet0/funding-safe-public-packet-v1-proof.sh
test -x ops/mainnet0/funding-public-proof-pack-abort-recovery-seal-v1-proof.sh

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' "$src" >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 11
fi

if grep -F 'APP.get("/public-node/funding-safe-public-packet-v1.json"' "$src" >/dev/null; then
  echo "safe public packet must remain docs/proof-only; runtime route unexpectedly present" >&2
  exit 12
fi

echo "VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN"
