#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-void-buy-pool-public-reviewer-verify-pack-html-visible-marker-runtime-repair-v1.md").read_text()

repair_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1"
readiness_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1"
desired = "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_LINKS_V1"
legacy = "VOID_USDC_VOID_BUY_POOL_REVIEWER_VERIFY_PACK_VISIBLE_LINKS_V1"
readiness_route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1"
html_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"
json_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"

if repair_marker not in doc:
    raise SystemExit("repair_doc_marker_missing")

if legacy in src:
    raise SystemExit("legacy_visible_marker_still_present")

if desired not in src:
    raise SystemExit("desired_visible_marker_missing_from_source")

# The readiness route path appears in route-index/accounting data before the actual HTML renderer.
# Search all readiness-marker windows and require at least one HTML source window with the desired marker plus reviewer links.
positions = []
start = 0
while True:
    pos = src.find(readiness_marker, start)
    if pos < 0:
        break
    positions.append(pos)
    start = pos + len(readiness_marker)

if not positions:
    raise SystemExit("readiness_marker_missing_from_source")

matching_windows = []
for pos in positions:
    window = src[max(0, pos - 2500): pos + 8000]
    if desired in window and html_route in window and json_route in window:
        matching_windows.append(pos)

if not matching_windows:
    raise SystemExit("desired_visible_marker_missing_from_readiness_html_source_window")

route_positions = []
start = 0
while True:
    pos = src.find(readiness_route, start)
    if pos < 0:
        break
    route_positions.append(pos)
    start = pos + len(readiness_route)

if not route_positions:
    raise SystemExit("readiness_route_missing_from_source")

for forbidden in [
    "automatic_fulfillment_enabled: true",
    "wallet_fulfillment_enabled: true",
    "manual_fulfillment_record_created_now: true",
    "buyer_execution_authorized: true",
    "private_execution_packet_public: true",
]:
    if forbidden in src:
        raise SystemExit(f"forbidden_runtime_flag_present={forbidden}")

print(f"readiness_marker_occurrences={len(positions)}")
print(f"readiness_route_occurrences={len(route_positions)}")
print(f"matching_readiness_html_windows={len(matching_windows)}")
print("visible_marker_runtime_repair_source_green=true")
PY

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1_GREEN"
