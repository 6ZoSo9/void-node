#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_ROUTE_INDEX_CLOSEOUT_STATUS_DISCOVERY_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path
import re

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-void-buy-pool-route-index-closeout-status-discovery-v1.md").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_ROUTE_INDEX_CLOSEOUT_STATUS_DISCOVERY_V1"
closeout_route = "/public-node/usdc-void-buy-pool/closeout-status-v1.json"
closeout_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1"
dashboard_link_marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_CLOSEOUT_STATUS_LINK_V1"
reviewer_html_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1"
reviewer_json_route = "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json"
readiness_html_route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1"

if marker not in doc:
    raise SystemExit("doc_marker_missing")

if src.count(marker) != 1:
    raise SystemExit(f"source_marker_count_bad={src.count(marker)}")

if closeout_route not in src:
    raise SystemExit("closeout_route_missing")

if closeout_marker not in src:
    raise SystemExit("closeout_marker_missing")

if dashboard_link_marker not in src:
    raise SystemExit("dashboard_link_marker_missing")

pattern = re.compile(
    r'\{\s*path:\s*"/public-node/usdc-void-buy-pool/closeout-status-v1\.json",\s*kind:\s*"json",\s*marker:\s*"VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1",\s*use:\s*"([^"]*)"\s*\}',
    re.DOTALL,
)

matches = list(pattern.finditer(src))
if len(matches) != 1:
    raise SystemExit(f"closeout_route_index_entry_match_count_bad={len(matches)}")

entry = matches[0].group(0)

for required in [
    closeout_route,
    closeout_marker,
    marker,
    dashboard_link_marker,
    'kind: "json"',
]:
    if required not in entry:
        raise SystemExit(f"route_index_entry_required_text_missing={required}")

for required_route in [
    "/public-node",
    closeout_route,
    reviewer_html_route,
    reviewer_json_route,
    readiness_html_route,
]:
    if required_route not in src and required_route not in doc:
        raise SystemExit(f"discovery_chain_route_missing={required_route}")

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

print("closeout_route_index_entry_green=true")
print("route_index_closeout_status_discovery_source_green=true")
PY

echo "VOID_USDC_VOID_BUY_POOL_ROUTE_INDEX_CLOSEOUT_STATUS_DISCOVERY_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_ROUTE_INDEX_CLOSEOUT_STATUS_DISCOVERY_V1_GREEN"
