#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_CLOSEOUT_STATUS_LINK_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-void-buy-pool-public-node-closeout-status-link-v1.md").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_CLOSEOUT_STATUS_LINK_V1"
dashboard_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1"
closeout_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1"
closeout_route = "/public-node/usdc-void-buy-pool/closeout-status-v1.json"
readiness_route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1"

html_link_needles = [
    f"<!-- {marker} -->",
    f'<a href="{closeout_route}">Closeout status JSON</a>',
]

if marker not in doc:
    raise SystemExit("doc_marker_missing")

source_marker_count = src.count(marker)
if source_marker_count < 1:
    raise SystemExit(f"source_marker_count_too_low={source_marker_count}")

if closeout_marker not in src:
    raise SystemExit("closeout_status_marker_missing_from_source")

if closeout_route not in src:
    raise SystemExit("closeout_status_route_missing_from_source")

for needle in html_link_needles:
    if needle not in src:
        raise SystemExit(f"dashboard_html_link_needle_missing={needle}")

positions = []
start = 0
while True:
    pos = src.find(dashboard_marker, start)
    if pos < 0:
        break
    positions.append(pos)
    start = pos + len(dashboard_marker)

if not positions:
    raise SystemExit("dashboard_marker_missing_from_source")

matching_dashboard_windows = []
for pos in positions:
    window = src[max(0, pos - 1000):pos + 9000]
    if marker in window and closeout_route in window and readiness_route in window and "Closeout status JSON" in window:
        matching_dashboard_windows.append(pos)

if not matching_dashboard_windows:
    raise SystemExit("closeout_link_missing_from_dashboard_window")

for forbidden in [
    "public_mutation_enabled: true",
    "automatic_fulfillment_enabled: true",
    "wallet_fulfillment_enabled: true",
    "manual_fulfillment_record_created_now: true",
    "buyer_execution_authorized: true",
    "private_execution_packet_public: true",
    "wc_ledger_write: true",
    "void_transfer_now: true",
]:
    if forbidden in src:
        raise SystemExit(f"forbidden_true_flag_present={forbidden}")

print(f"source_marker_count={source_marker_count}")
print(f"dashboard_marker_occurrences={len(positions)}")
print(f"matching_dashboard_windows={len(matching_dashboard_windows)}")
print("closeout_status_dashboard_link_source_green=true")
PY

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_CLOSEOUT_STATUS_LINK_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_CLOSEOUT_STATUS_LINK_V1_GREEN"
