#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-reviewer-verify-pack-html-v1.md"
src="src/index.ts"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json" "$doc" >/dev/null
grep -F "public read-only HTML wrapper" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1" "$src" >/dev/null
grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_LINKS_V1" "$src" >/dev/null
grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"' "$src" >/dev/null
grep -F 'href="/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1">Reviewer verify pack page</a>' "$src" >/dev/null
grep -F 'href="/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json">Open reviewer verify pack JSON</a>' "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()

html_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1"
visible_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_LINKS_V1"
html_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"
json_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"

runtime_html_count = s.count('runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"')
if runtime_html_count != 1:
    raise SystemExit(f"reviewer_verify_pack_html_runtime_route_count_bad={runtime_html_count}")

runtime_json_count = s.count('runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"')
if runtime_json_count != 1:
    raise SystemExit(f"reviewer_verify_pack_json_runtime_route_count_bad={runtime_json_count}")

if 'APP.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"' in s:
    raise SystemExit("reviewer_verify_pack_html_non_runtime_app_route_present")

if 'post("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1' in s:
    raise SystemExit("reviewer_verify_pack_public_post_route_present")

route_index_start = s.find('APP.get("/public-node/route-index.json"')
if route_index_start < 0:
    raise SystemExit("route_index_route_missing")

route_index_end = s.find('APP.get("', route_index_start + 1)
if route_index_end < 0:
    route_index_end = len(s)

route_index_block = s[route_index_start:route_index_end]

html_entry = re.compile(
    r'path:\s*"' + re.escape(html_route) + r'"\s*,\s*kind:\s*"html"\s*,\s*marker:\s*"' + re.escape(html_marker) + r'"'
)
html_entry_count = len(html_entry.findall(route_index_block))
if html_entry_count != 1:
    raise SystemExit(f"reviewer_verify_pack_html_route_index_entry_count_bad={html_entry_count}")

json_entry = re.compile(
    r'path:\s*"' + re.escape(json_route) + r'"\s*,\s*kind:\s*"json"\s*,\s*marker:\s*"VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1"'
)
json_entry_count = len(json_entry.findall(route_index_block))
if json_entry_count != 1:
    raise SystemExit(f"reviewer_verify_pack_json_route_index_entry_count_bad={json_entry_count}")

html_route_start = s.find('runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"')
if html_route_start < 0:
    raise SystemExit("html_route_start_missing")

next_runtime = s.find('runtimeApp.get("', html_route_start + 1)
if next_runtime < 0:
    next_runtime = len(s)

html_block = s[html_route_start:next_runtime]

for required in [
    html_marker,
    "This page is a human-readable wrapper",
    "Open reviewer verify pack JSON",
    json_route,
    "/public-node",
    "/public-node/usdc-void-buy-pool/readiness-rollup-v1",
    "/public-node/buy-pool/usdc-void-v1",
    "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1",
    "public_read_only=true",
    "creates_quote=false",
    "accepts_payment=false",
    "public_fulfillment_endpoint=false",
    "wallet_send_authority=false",
    "autonomous_write_authority=false",
    "ledger_mutation=false",
    "void_delivery=false",
]:
    if required not in html_block:
        raise SystemExit(f"html_block_required_text_missing={required}")

if s.count(visible_marker) != 2:
    raise SystemExit(f"visible_marker_count_bad={s.count(visible_marker)}")

dashboard_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1"
dashboard_start = s.find(dashboard_marker)
if dashboard_start < 0:
    raise SystemExit("dashboard_marker_missing")
dashboard_end = s.find("</div>", dashboard_start)
if dashboard_end < 0:
    raise SystemExit("dashboard_end_missing")
dashboard_block = s[dashboard_start:dashboard_end]
if visible_marker not in dashboard_block or html_route not in dashboard_block:
    raise SystemExit("dashboard_html_visible_link_missing")

readiness_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1"
readiness_start = s.find(readiness_marker)
if readiness_start < 0:
    raise SystemExit("readiness_marker_missing")
readiness_end = s.find('runtimeApp.get("', readiness_start + 1)
if readiness_end < 0:
    readiness_end = len(s)
readiness_block = s[readiness_start:readiness_end]
if visible_marker not in readiness_block or html_route not in readiness_block:
    raise SystemExit("readiness_html_visible_link_missing")

print("reviewer_verify_pack_html_source_green=true")
PY

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-reviewer-html-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-reviewer-html-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-reviewer-html-route-audit.out >/dev/null

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1_GREEN"
