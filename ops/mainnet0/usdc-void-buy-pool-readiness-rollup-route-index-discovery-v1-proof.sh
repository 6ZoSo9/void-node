#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-readiness-rollup-route-index-discovery-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_READINESS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_READINESS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1" "$doc" >/dev/null
grep -F "/public-node/route-index.json" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_READINESS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1" "$src" >/dev/null
grep -F 'APP.get("/public-node/route-index.json"' "$src" >/dev/null
grep -F 'path: "/public-node/buy-pool/usdc-void-v1", kind: "html"' "$src" >/dev/null
grep -F 'path: "/public-node/buy-pool/usdc-void-v1.json", kind: "json"' "$src" >/dev/null
grep -F 'path: "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json", kind: "json"' "$src" >/dev/null
grep -F 'path: "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1", kind: "html"' "$src" >/dev/null
grep -F 'marker: "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1"' "$src" >/dev/null
grep -F 'marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1"' "$src" >/dev/null
grep -F 'marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1"' "$src" >/dev/null
grep -F 'automatic delivery disabled' "$src" >/dev/null
grep -F 'private no-leak boundary' "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
route_index_start = s.find('APP.get("/public-node/route-index.json"')
if route_index_start < 0:
    raise SystemExit("route_index_runtime_route_missing")

next_app = s.find('APP.get("', route_index_start + 1)
if next_app < 0:
    next_app = len(s)

block = s[route_index_start:next_app]

targets = {
    "/public-node/buy-pool/usdc-void-v1": "html",
    "/public-node/buy-pool/usdc-void-v1.json": "json",
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json": "json",
    "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1": "html",
}

for path, kind in targets.items():
    pattern = r'path:\s*"' + re.escape(path) + r'"\s*,\s*kind:\s*"' + kind + r'"'
    if not re.search(pattern, block):
        raise SystemExit(f"route_index_target_missing_or_wrong_kind={path}:{kind}")

# Ensure the new readiness rollup appears exactly once in the route-index block.
if block.count('/public-node/usdc-void-buy-pool/readiness-rollup-v1.json') != 1:
    raise SystemExit("readiness_rollup_route_index_count_not_one")

# Source route itself must be the single live runtimeApp registration, not a duplicate app.get.
registrations = re.findall(
    r'([A-Za-z0-9_$.\]\[\(\)"\'?]+)\.get\(\s*["\']/public-node/usdc-void-buy-pool/readiness-rollup-v1\.json["\']',
    s,
)
if registrations != ["runtimeApp"]:
    raise SystemExit(f"readiness_rollup_route_registration_not_single_runtimeApp={registrations}")

print("readiness_rollup_route_index_source_green=true")
PY

if grep -F 'post("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json' "$src" >/dev/null; then
  echo "readiness_rollup_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_READINESS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_READINESS_ROLLUP_ROUTE_INDEX_DISCOVERY_V1_GREEN"
