#!/usr/bin/env bash
set -euo pipefail

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-kind-tighten-proof-forward-safe-for-reviewer-verify-pack-v1.md"

echo "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1_PROOF_BEGIN"

test -f "$src"
test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_KIND_TIGHTEN_PROOF_FORWARD_SAFE_FOR_REVIEWER_VERIFY_PACK_V1" "$doc" >/dev/null
grep -F "counts exact route-index entries" "$doc" >/dev/null
grep -F "proof-only forward-safety repair" "$doc" >/dev/null

python3 - <<'PY2'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()

route_index_start = s.find('APP.get("/public-node/route-index.json"')
if route_index_start < 0:
    raise SystemExit("route_index_route_missing")

next_app = s.find('APP.get("', route_index_start + 1)
if next_app < 0:
    next_app = len(s)

block = s[route_index_start:next_app]

targets = [
    ("/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1", "html"),
    ("/public-node/usdc-void-buy-pool/readiness-rollup-v1", "html"),
]

for target, kind in targets:
    exact_entry = re.compile(
        r'path:\s*"' + re.escape(target) + r'"\s*,\s*kind:\s*"' + re.escape(kind) + r'"'
    )
    matches = exact_entry.findall(block)
    if len(matches) != 1:
        raise SystemExit(f"target_route_index_exact_entry_count_bad target={target} kind={kind} count={len(matches)}")

json_targets = [
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json",
    "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json",
]

for target in json_targets:
    exact_entry = re.compile(
        r'path:\s*"' + re.escape(target) + r'"\s*,\s*kind:\s*"json"'
    )
    matches = exact_entry.findall(block)
    if len(matches) != 1:
        raise SystemExit(f"json_target_route_index_exact_entry_count_bad target={target} count={len(matches)}")

for marker in [
    "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1",
]:
    if marker not in block:
        raise SystemExit(f"route_index_marker_missing={marker}")

# Guard against accidental mutation routes for these public reviewer surfaces.
for bad in [
    'post("/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1',
    'post("/public-node/usdc-void-buy-pool/readiness-rollup-v1',
    'post("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1',
]:
    if bad in s:
        raise SystemExit(f"unexpected_public_mutation_route={bad}")

print("route_index_runtime_kind_tighten_targets_html=true")
print("route_index_runtime_kind_tighten_exact_route_index_entries=true")
PY2

echo "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_EXECUTION_HOLD_STATUS_ROUTE_INDEX_RUNTIME_KIND_TIGHTEN_V1_GREEN"
