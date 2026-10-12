#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-reviewer-verify-pack-v1.md"
src="src/index.ts"
safety="ops/mainnet0/public-surface-safety-index-v1-proof.sh"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json" "$doc" >/dev/null
grep -F "/public-node" "$doc" >/dev/null
grep -F "/public-node/route-index.json" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$doc" >/dev/null
grep -F "public read-only" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1" "$src" >/dev/null
grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"' "$src" >/dev/null
grep -F 'path: "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json", kind: "json"' "$src" >/dev/null
grep -F 'VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_ROUTE_INDEX_DISCOVERY_V1' "$src" >/dev/null
grep -F "copy_paste_verify_commands" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1" "$src" >/dev/null
grep -F "no_automatic_void_delivery: true" "$src" >/dev/null
grep -F "no_public_fulfillment_endpoint: true" "$src" >/dev/null
grep -F "no_public_wallet_send_authority: true" "$src" >/dev/null
grep -F "no_autonomous_write_authority: true" "$src" >/dev/null
grep -F "no_public_ledger_mutation: true" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"

regs = re.findall(
    r'([A-Za-z0-9_$.\]\[\(\)"\'?]+)\.get\(\s*["\']'
    + re.escape(route)
    + r'["\']',
    s,
)
if regs != ["runtimeApp"]:
    raise SystemExit(f"reviewer_verify_pack_registration_not_single_runtimeApp={regs}")

route_index_start = s.find('APP.get("/public-node/route-index.json"')
if route_index_start < 0:
    raise SystemExit("route_index_route_missing")

next_app = s.find('APP.get("', route_index_start + 1)
if next_app < 0:
    next_app = len(s)

block = s[route_index_start:next_app]

entry_pattern = re.compile(
    r'path:\s*"' + re.escape(route) + r'"\s*,\s*kind:\s*"json"'
)
entries = entry_pattern.findall(block)
if len(entries) != 1:
    raise SystemExit(f"reviewer_verify_pack_route_index_exact_count_not_one={len(entries)}")

if "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1" not in block:
    raise SystemExit("reviewer_verify_pack_marker_missing_from_route_index")

for required in [
    "/public-node",
    "/public-node/route-index.json",
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1",
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json",
    "/public-node/buy-pool/usdc-void-v1",
    "/public-node/buy-pool/usdc-void-v1.json",
    "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1",
]:
    if required not in s:
        raise SystemExit(f"reviewer_verify_pack_missing_required_route={required}")

print("reviewer_verify_pack_source_green=true")
PY

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-reviewer-verify-pack-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-reviewer-verify-pack-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-reviewer-verify-pack-route-audit.out >/dev/null

expected_count="$(grep -Eo 'public_literal_get_count=[0-9]+' "$safety" | head -1 | cut -d= -f2)"
expected_unique="$(grep -Eo 'public_literal_get_unique_count=[0-9]+' "$safety" | head -1 | cut -d= -f2)"
grep -F "public_literal_get_count=$expected_count" /tmp/void-reviewer-verify-pack-route-audit.out >/dev/null
grep -F "public_literal_get_unique_count=$expected_unique" /tmp/void-reviewer-verify-pack-route-audit.out >/dev/null

if grep -F 'post("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1' "$src" >/dev/null; then
  echo "reviewer_verify_pack_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1_GREEN"
