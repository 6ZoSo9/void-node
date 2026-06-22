#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1_PROOF_BEGIN"

python3 - <<'PY'
from pathlib import Path

src = Path("src/index.ts").read_text()
doc = Path("docs/public/public-node-usdc-void-buy-pool-public-closeout-status-v1.md").read_text()

marker = "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1"
route = "/public-node/usdc-void-buy-pool/closeout-status-v1.json"

if marker not in doc:
    raise SystemExit("doc_marker_missing")

if src.count(marker) < 3:
    raise SystemExit(f"source_marker_count_too_low={src.count(marker)}")

if route not in src:
    raise SystemExit("runtime_route_missing")

required_false_flags = [
    "public_mutation_enabled: false",
    "automatic_fulfillment_enabled: false",
    "wallet_fulfillment_enabled: false",
    "manual_fulfillment_record_created_now: false",
    "buyer_execution_authorized: false",
    "private_execution_packet_public: false",
    "wc_ledger_write: false",
    "void_transfer_now: false",
]

for flag in required_false_flags:
    if flag not in src:
        raise SystemExit(f"required_false_flag_missing={flag}")

required_markers = [
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1",
    "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1",
]

for required in required_markers:
    if required not in src:
        raise SystemExit(f"required_marker_missing={required}")

for forbidden in [
    "public_mutation_enabled: true",
    "automatic_fulfillment_enabled: true",
    "wallet_fulfillment_enabled: true",
    "manual_fulfillment_record_created_now: true",
    "buyer_execution_authorized: true",
    "private_execution_packet_public: true",
]:
    if forbidden in src:
        raise SystemExit(f"forbidden_true_flag_present={forbidden}")

print("closeout_status_source_green=true")
PY

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1_GREEN"
