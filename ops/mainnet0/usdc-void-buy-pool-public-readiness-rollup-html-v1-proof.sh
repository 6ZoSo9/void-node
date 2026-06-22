#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-usdc-void-buy-pool-public-readiness-rollup-html-v1.md"
src="src/index.ts"
safety="ops/mainnet0/public-surface-safety-index-v1-proof.sh"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1" "$doc" >/dev/null
grep -F "/public-node/buy-pool/usdc-void-v1.json" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1" "$doc" >/dev/null
grep -F "public read-only" "$doc" >/dev/null
grep -F "does not create a quote" "$doc" >/dev/null
grep -F "grant wallet-send authority" "$doc" >/dev/null
grep -F "mutate ledger state" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1" "$src" >/dev/null
grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/readiness-rollup-v1"' "$src" >/dev/null
grep -F 'path: "/public-node/usdc-void-buy-pool/readiness-rollup-v1", kind: "html"' "$src" >/dev/null
grep -F 'path: "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json", kind: "json"' "$src" >/dev/null
grep -F 'VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_ROUTE_INDEX_DISCOVERY_V1' "$src" >/dev/null
grep -F "No automatic VOID delivery" "$src" >/dev/null
grep -F "No public fulfillment endpoint" "$src" >/dev/null
grep -F "No public wallet-send authority" "$src" >/dev/null
grep -F "No autonomous write authority" "$src" >/dev/null
grep -F "No public ledger mutation" "$src" >/dev/null
grep -F "No private buyer/payment/operator packet/key/send material exposed" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
html_route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1"
json_route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"

def regs(route):
    return re.findall(
        r'([A-Za-z0-9_$.\]\[\(\)"\'?]+)\.get\(\s*["\']'
        + re.escape(route)
        + r'["\']',
        s,
    )

html_regs = regs(html_route)
json_regs = regs(json_route)

if html_regs != ["runtimeApp"]:
    raise SystemExit(f"readiness_rollup_html_registration_not_single_runtimeApp={html_regs}")
if json_regs != ["runtimeApp"]:
    raise SystemExit(f"readiness_rollup_json_registration_not_single_runtimeApp={json_regs}")

route_index_start = s.find('APP.get("/public-node/route-index.json"')
if route_index_start < 0:
    raise SystemExit("route_index_route_missing")

next_app = s.find('APP.get("', route_index_start + 1)
if next_app < 0:
    next_app = len(s)

block = s[route_index_start:next_app]

html_entry_pattern = re.compile(
    r'path:\s*"' + re.escape(html_route) + r'"\s*,\s*kind:\s*"html"'
)
json_entry_pattern = re.compile(
    r'path:\s*"' + re.escape(json_route) + r'"\s*,\s*kind:\s*"json"'
)

html_entries = html_entry_pattern.findall(block)
json_entries = json_entry_pattern.findall(block)

if len(html_entries) != 1:
    raise SystemExit(f"readiness_rollup_html_route_index_exact_count_not_one={len(html_entries)}")
if len(json_entries) != 1:
    raise SystemExit(f"readiness_rollup_json_route_index_exact_count_not_one={len(json_entries)}")
if "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1" not in block:
    raise SystemExit("readiness_rollup_html_marker_missing_from_route_index")
if "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1" not in block:
    raise SystemExit("readiness_rollup_json_marker_missing_from_route_index")

print("readiness_rollup_html_source_green=true")
PY

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-readiness-rollup-html-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-readiness-rollup-html-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-readiness-rollup-html-route-audit.out >/dev/null

expected_count="$(grep -Eo 'public_literal_get_count=[0-9]+' "$safety" | head -1 | cut -d= -f2)"
expected_unique="$(grep -Eo 'public_literal_get_unique_count=[0-9]+' "$safety" | head -1 | cut -d= -f2)"
grep -F "public_literal_get_count=$expected_count" /tmp/void-readiness-rollup-html-route-audit.out >/dev/null
grep -F "public_literal_get_unique_count=$expected_unique" /tmp/void-readiness-rollup-html-route-audit.out >/dev/null

if grep -F 'post("/public-node/usdc-void-buy-pool/readiness-rollup-v1' "$src" >/dev/null; then
  echo "readiness_rollup_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1_GREEN"
