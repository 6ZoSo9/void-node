#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-reviewer-verify-pack-html-runtime-marker-attribute-repair-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_RUNTIME_MARKER_ATTRIBUTE_REPAIR_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_RUNTIME_MARKER_ATTRIBUTE_REPAIR_V1" "$doc" >/dev/null
grep -F "runtime-visible" "$doc" >/dev/null
grep -F "data-void-marker" "$doc" >/dev/null
grep -F "visibility-only repair" "$doc" >/dev/null
grep -F "does not add a route" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

python3 - <<'PY'
from pathlib import Path

s = Path("src/index.ts").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_LINKS_V1"
html_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"

old = f'<li><!-- {marker} --><a href="{html_route}">Reviewer verify pack page</a></li>'
new = f'<li data-void-marker="{marker}"><a href="{html_route}">Reviewer verify pack page</a></li>'

if old in s:
    raise SystemExit("old_comment_marker_link_still_present")

if s.count(new) != 2:
    raise SystemExit(f"attribute_marker_link_count_bad={s.count(new)}")

if s.count(marker) != 2:
    raise SystemExit(f"marker_count_bad={s.count(marker)}")

dashboard_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1"
dashboard_start = s.find(dashboard_marker)
if dashboard_start < 0:
    raise SystemExit("dashboard_marker_missing")
dashboard_end = s.find("</div>", dashboard_start)
if dashboard_end < 0:
    raise SystemExit("dashboard_end_missing")
dashboard_block = s[dashboard_start:dashboard_end]

if new not in dashboard_block:
    raise SystemExit("dashboard_attribute_marker_link_missing")

readiness_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1"
readiness_start = s.find(readiness_marker)
if readiness_start < 0:
    raise SystemExit("readiness_marker_missing")
readiness_end = s.find('runtimeApp.get("', readiness_start + 1)
if readiness_end < 0:
    readiness_end = len(s)
readiness_block = s[readiness_start:readiness_end]

if new not in readiness_block:
    raise SystemExit("readiness_attribute_marker_link_missing")

if s.count('runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"') != 1:
    raise SystemExit("reviewer_html_route_count_bad")

if s.count('runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"') != 1:
    raise SystemExit("reviewer_json_route_count_bad")

if 'post("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1' in s:
    raise SystemExit("unexpected_public_post_route")

print("reviewer_verify_pack_html_runtime_marker_attribute_repair_source_green=true")
PY

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-reviewer-html-marker-attribute-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-reviewer-html-marker-attribute-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-reviewer-html-marker-attribute-route-audit.out >/dev/null

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_RUNTIME_MARKER_ATTRIBUTE_REPAIR_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_RUNTIME_MARKER_ATTRIBUTE_REPAIR_V1_GREEN"
