#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-readiness-rollup-runtime-mount-repair-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "source proof green but the live route returning 404" "$doc" >/dev/null
grep -F "adjacent to the already-live operator execution hold status route" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1" "$src" >/dev/null
grep -F 'runtime_mount_repair_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1"' "$src" >/dev/null
grep -F 'marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1"' "$src" >/dev/null
grep -F '/public-node/usdc-void-buy-pool/readiness-rollup-v1.json' "$src" >/dev/null
grep -F '/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1' "$src" >/dev/null
grep -F "public_read_only: true" "$src" >/dev/null
grep -F "public_mutation_open: false" "$src" >/dev/null
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

repair_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1"
rollup_route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"
status_route = "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1"

rm = s.find(repair_marker)
if rm < 0:
    raise SystemExit("repair_marker_missing")

route_pos = s.find(rollup_route, rm)
if route_pos < 0:
    raise SystemExit("repair_route_missing_after_marker")

status_pos = s.find(status_route, route_pos)
if status_pos < 0:
    raise SystemExit("status_route_missing_after_repair_route")

# The repair should precede the known-live status route so it is likely before the same live mount/catch-all context.
if not (rm < route_pos < status_pos):
    raise SystemExit("repair_route_not_before_live_status_route")

next_post = s.find('post("'+rollup_route+'"', rm)
if next_post >= 0:
    raise SystemExit("readiness_rollup_repair_post_route_present")

print("readiness_rollup_runtime_mount_repair_source_green=true")
PY

if grep -F 'app.post("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json' "$src" >/dev/null; then
  echo "readiness_rollup_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1_GREEN"
