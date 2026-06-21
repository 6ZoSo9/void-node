#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-readiness-rollup-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "funding page readiness" "$doc" >/dev/null
grep -F "public buy-pool HTML route" "$doc" >/dev/null
grep -F "public buy-pool JSON route" "$doc" >/dev/null
grep -F "buyer-facing HTML safety card" "$doc" >/dev/null
grep -F "machine-readable buyer-status JSON fields" "$doc" >/dev/null
grep -F "operator execution hold status" "$doc" >/dev/null
grep -F "route-index discovery entries" "$doc" >/dev/null
grep -F "private/manual execution packet boundary" "$doc" >/dev/null
grep -F "public mutation boundary" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1" "$src" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$src" >/dev/null
grep -F 'status: "public_readiness_rollup_ready"' "$src" >/dev/null
grep -F "public_read_only: true" "$src" >/dev/null
grep -F "public_mutation_open: false" "$src" >/dev/null
grep -F 'route: "/public-node/funding"' "$src" >/dev/null
grep -F 'route: "/public-node/buy-pool/usdc-void-v1"' "$src" >/dev/null
grep -F 'route: "/public-node/buy-pool/usdc-void-v1.json"' "$src" >/dev/null
grep -F 'buyer_status_card_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_CARD_V1"' "$src" >/dev/null
grep -F 'buyer_status_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1"' "$src" >/dev/null
grep -F 'route: "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1"' "$src" >/dev/null
grep -F 'status: "manual_gated_withheld"' "$src" >/dev/null
grep -F "public_fulfillment_endpoint_open: false" "$src" >/dev/null
grep -F "automatic_void_delivery: false" "$src" >/dev/null
grep -F "public_wallet_send_authority: false" "$src" >/dev/null
grep -F "autonomous_write_authority: false" "$src" >/dev/null
grep -F "private_operator_packet_material_exposed: false" "$src" >/dev/null
grep -F "private_buyer_payment_records_exposed: false" "$src" >/dev/null
grep -F "wallet_keys_exposed: false" "$src" >/dev/null
grep -F "send_commands_exposed: false" "$src" >/dev/null
grep -F "private_manual_execution_packet_marker_publicly_exposed: false" "$src" >/dev/null
grep -F "creates_quote: false" "$src" >/dev/null
grep -F "accepts_payment: false" "$src" >/dev/null
grep -F "opens_fulfillment_endpoint: false" "$src" >/dev/null
grep -F "performs_wallet_send: false" "$src" >/dev/null
grep -F "mutates_ledger: false" "$src" >/dev/null
grep -F "grants_autonomous_write_authority: false" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
s = Path("src/index.ts").read_text()
route = 'app.get("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"'
start = s.find(route)
if start < 0:
    raise SystemExit("readiness_rollup_route_missing")
marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1"
m = s.find(marker, start)
if m < 0:
    raise SystemExit("readiness_rollup_marker_not_inside_route")
next_post = s.find('app.post("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"', start)
if next_post >= 0:
    raise SystemExit("readiness_rollup_post_route_present")
print("readiness_rollup_route_source_green=true")
PY

if grep -F 'app.post("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json' "$src" >/dev/null; then
  echo "readiness_rollup_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1_GREEN"
