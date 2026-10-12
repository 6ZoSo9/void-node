#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
doc="docs/public/public-node-funding-safe-public-packet-v1.md"

grep -F "VOID_FUNDING_SAFE_PUBLIC_PACKET_DOC_V1" "$doc" >/dev/null
grep -F "docs/proof-only" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "ca3babbe" "$doc" >/dev/null

grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$doc" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$doc" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$doc" >/dev/null
grep -F "VOID_FUNDING_ABORT_RECOVERY_SEAL_RUNTIME_BASELINE_STILL_GREEN" "$doc" >/dev/null

grep -F "/public-node" "$doc" >/dev/null
grep -F "/public-node/funding" "$doc" >/dev/null
grep -F "/buy-void" "$doc" >/dev/null
grep -F "/funding" "$doc" >/dev/null
grep -F "/public-node/triad-seal-v1.json" "$doc" >/dev/null
grep -F "/public-node/route-index.json" "$doc" >/dev/null

grep -F "public_read_only=true" "$doc" >/dev/null
grep -F "public_mutation=false" "$doc" >/dev/null
grep -F "manual_review_required=true" "$doc" >/dev/null
grep -F "automatic_token_delivery=false" "$doc" >/dev/null
grep -F "public_fulfillment=false" "$doc" >/dev/null
grep -F "wallet_send_now=false" "$doc" >/dev/null
grep -F "money_movement_now=false" "$doc" >/dev/null
grep -F "investment_return_claim=false" "$doc" >/dev/null
grep -F "profit_promise=false" "$doc" >/dev/null
grep -F "yield_claim=false" "$doc" >/dev/null
grep -F "operator_queue_public=false" "$doc" >/dev/null
grep -F "treasury_controls_public=false" "$doc" >/dev/null
grep -F "payment_verification_public=false" "$doc" >/dev/null
grep -F "wallet_private_key_public=false" "$doc" >/dev/null
grep -F "admin_api_public=false" "$doc" >/dev/null

grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$src" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$src" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$src" >/dev/null

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' "$src" >/dev/null; then
  echo "aborted funding proof pack runtime route unexpectedly present" >&2
  exit 11
fi

if grep -F 'APP.get("/public-node/funding-safe-public-packet-v1.json"' "$src" >/dev/null; then
  echo "safe public packet must remain docs/proof-only; runtime route unexpectedly present" >&2
  exit 12
fi

echo "VOID_FUNDING_SAFE_PUBLIC_PACKET_V1_GREEN"
