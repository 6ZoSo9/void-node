#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-execution-hold-status-route-index-runtime-kind-tighten-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1" "$doc" >/dev/null
grep -F "real read-only runtime HTML pages" "$doc" >/dev/null
grep -F "does not" "$doc" >/dev/null
grep -F "grant autonomous write authority" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re
s = Path("src/index.ts").read_text()
targets = [
    "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1",
    "/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1",
]
for target in targets:
    pattern = re.compile(
        r'\{\s*path:\s*"' + re.escape(target) + r'"\s*,\s*kind:\s*"([^"]+)"',
        re.S,
    )
    matches = pattern.findall(s)
    if len(matches) != 1:
        raise SystemExit(f"target_count_bad target={target} count={len(matches)}")
    if matches[0] != "html":
        raise SystemExit(f"target_kind_bad target={target} kind={matches[0]}")
print("route_index_runtime_kind_tighten_targets_html=true")
PY

grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1"' "$src" >/dev/null
grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1"' "$src" >/dev/null
grep -F "g.__void_http_app || g.APP || g.app" "$src" >/dev/null

if grep -F 'app.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1"' "$src" >/dev/null; then
  echo "unsafe_top_level_app_get_status_route_present=true"
  exit 1
fi

if grep -F 'app.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1"' "$src" >/dev/null; then
  echo "unsafe_top_level_app_get_entry_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1_GREEN"
