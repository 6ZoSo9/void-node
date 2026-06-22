#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-reviewer-verify-pack-visible-links-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1" "$doc" >/dev/null
grep -F "/public-node" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json" "$doc" >/dev/null
grep -F "only adds public read-only links" "$doc" >/dev/null
grep -F "does not add a route" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1" "$src" >/dev/null
grep -F 'href="/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json">Reviewer verify pack JSON</a>' "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1" "$src" >/dev/null
grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"' "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path

s = Path("src/index.ts").read_text()
marker = "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1"
verify_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"

if s.count(marker) != 2:
    raise SystemExit(f"visible_links_marker_count_not_two={s.count(marker)}")

# Dashboard card block must contain the visible reviewer verify pack link.
dashboard_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1"
dashboard_start = s.find(dashboard_marker)
if dashboard_start < 0:
    raise SystemExit("dashboard_card_marker_missing")
dashboard_end = s.find("</div>", dashboard_start)
if dashboard_end < 0:
    raise SystemExit("dashboard_card_end_missing")
dashboard_block = s[dashboard_start:dashboard_end]

if marker not in dashboard_block:
    raise SystemExit("dashboard_visible_link_marker_missing")
if verify_route not in dashboard_block:
    raise SystemExit("dashboard_verify_pack_link_missing")
if "Reviewer verify pack JSON" not in dashboard_block:
    raise SystemExit("dashboard_verify_pack_link_label_missing")

# Human readiness rollup HTML block must contain the visible reviewer verify pack link.
readiness_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1"
readiness_start = s.find(readiness_marker)
if readiness_start < 0:
    raise SystemExit("readiness_rollup_html_marker_missing")

next_route = s.find('runtimeApp.get("', readiness_start + 1)
if next_route < 0:
    next_route = len(s)
readiness_block = s[readiness_start:next_route]

if marker not in readiness_block:
    raise SystemExit("readiness_visible_link_marker_missing")
if verify_route not in readiness_block:
    raise SystemExit("readiness_verify_pack_link_missing")
if "Reviewer verify pack JSON" not in readiness_block:
    raise SystemExit("readiness_verify_pack_link_label_missing")

# Guard that this patch did not introduce a duplicate route registration.
runtime_route_count = s.count('runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"')
if runtime_route_count != 1:
    raise SystemExit(f"reviewer_verify_pack_runtime_route_count_bad={runtime_route_count}")

if 'APP.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"' in s:
    raise SystemExit("reviewer_verify_pack_non_runtime_app_route_present")

print("reviewer_verify_pack_visible_links_source_green=true")
PY

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-visible-links-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-visible-links-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-visible-links-route-audit.out >/dev/null

if grep -F 'post("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1' "$src" >/dev/null; then
  echo "reviewer_verify_pack_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1_GREEN"
