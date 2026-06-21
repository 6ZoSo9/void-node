#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-buyer-status-json-fields-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$doc" >/dev/null
grep -F "operator execution remains manual" "$doc" >/dev/null
grep -F "automatic VOID delivery is false" "$doc" >/dev/null
grep -F "public fulfillment endpoint is false" "$doc" >/dev/null
grep -F "public wallet-send authority is false" "$doc" >/dev/null
grep -F "autonomous write authority is false" "$doc" >/dev/null
grep -F "private operator packet material is not exposed" "$doc" >/dev/null
grep -F "does not create a fulfillment endpoint" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1" "$src" >/dev/null
grep -F "buyer_status_marker" "$src" >/dev/null
grep -F "buyer_status" "$src" >/dev/null
grep -F "buy_pool_quote_public_readable: true" "$src" >/dev/null
grep -F 'operator_execution: "manual_gated_withheld"' "$src" >/dev/null
grep -F "automatic_void_delivery: false" "$src" >/dev/null
grep -F "public_fulfillment_endpoint_open: false" "$src" >/dev/null
grep -F "public_wallet_send_authority: false" "$src" >/dev/null
grep -F "autonomous_write_authority: false" "$src" >/dev/null
grep -F "private_operator_packet_material_exposed: false" "$src" >/dev/null
grep -F "private_buyer_payment_records_exposed: false" "$src" >/dev/null
grep -F "wallet_keys_exposed: false" "$src" >/dev/null
grep -F "send_commands_exposed: false" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
s = Path("src/index.ts").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1"

json_path = "/public-node/buy-pool/usdc-void-v1.json"
route_patterns = [
    'app.get("/public-node/buy-pool/usdc-void-v1.json"',
    'APP.get("/public-node/buy-pool/usdc-void-v1.json"',
    "app.get('/public-node/buy-pool/usdc-void-v1.json'",
    "APP.get('/public-node/buy-pool/usdc-void-v1.json'",
]
route_start = -1
for pat in route_patterns:
    route_start = s.find(pat)
    if route_start >= 0:
        break
if route_start < 0:
    raise SystemExit("buy_pool_json_route_missing")

public_json_anchor = s.find(json_path)
if public_json_anchor < 0:
    raise SystemExit("buy_pool_public_json_anchor_missing")

fixed_page_marker = "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1"
fixed_marker_pos = s.find(fixed_page_marker)
if fixed_marker_pos < 0:
    raise SystemExit("fixed_price_buy_pool_public_page_marker_missing")

next_route_after_json = s.find('.get("', route_start + 1)
if next_route_after_json < 0:
    next_route_after_json = len(s)

marker_positions = []
pos = s.find(marker)
while pos >= 0:
    marker_positions.append(pos)
    pos = s.find(marker, pos + 1)

if not marker_positions:
    raise SystemExit("buyer_status_json_marker_missing")

required_tokens = [
    "buyer_status_marker",
    "buyer_status",
    "buy_pool_quote_public_readable",
    "operator_execution",
    "automatic_void_delivery",
    "public_fulfillment_endpoint_open",
    "public_wallet_send_authority",
    "autonomous_write_authority",
    "private_operator_packet_material_exposed",
    "private_buyer_payment_records_exposed",
    "wallet_keys_exposed",
    "send_commands_exposed",
]

valid = []
for m in marker_positions:
    in_shared_public_object = fixed_marker_pos <= m < route_start
    in_inline_json_route = route_start <= m < next_route_after_json
    if not (in_shared_public_object or in_inline_json_route):
        continue

    ok = True
    for token in required_tokens:
        t = s.find(token, max(0, m - 500), m + 1800)
        if t < 0:
            ok = False
            break
    if ok:
        valid.append((m, in_shared_public_object, in_inline_json_route))

if not valid:
    raise SystemExit(
        "buyer_status_json_no_valid_marker_placement "
        f"marker_positions={marker_positions} fixed_marker={fixed_marker_pos} route_start={route_start} next_route={next_route_after_json}"
    )

m, in_shared_public_object, in_inline_json_route = valid[0]
print(f"buyer_status_json_marker_occurrences={len(marker_positions)}")
print(f"buyer_status_json_valid_marker={m}")
print(f"buyer_status_json_marker_placement=shared_public_object:{in_shared_public_object},inline_json_route:{in_inline_json_route}")
print("buyer_status_json_fields_public_route_source_green=true")
PY

if grep -F 'app.post("/public-node/buy-pool/usdc-void-v1' "$src" >/dev/null; then
  echo "buy_pool_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1_GREEN"
