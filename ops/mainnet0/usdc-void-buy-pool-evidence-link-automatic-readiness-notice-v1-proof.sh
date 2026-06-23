#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-evidence-link-automatic-readiness-notice-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-evidence-link-automatic-readiness-notice-v1.json"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

need "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1" "$doc"
need "Automatic fulfillment is a target end-state" "$doc"
need "Automatic fulfillment is not enabled now" "$doc"
need "public mutation remains disabled" "$doc"

need "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1" "$fixture"
need "\"automatic_fulfillment_target_state\": \"allowed_later_after_all_activation_gates_green\"" "$fixture"
need "\"automatic_fulfillment_enabled_now\": false" "$fixture"
need "\"evidence_bundle_html_route\": \"/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1\"" "$fixture"
need "\"public_mutation_enabled\": false" "$fixture"
need "\"runtime_queue_enabled\": false" "$fixture"
need "\"live_fetch_now\": false" "$fixture"
need "\"finality_verified_now\": false" "$fixture"
need "\"real_payment_verified_now\": false" "$fixture"
need "\"automatic_fulfillment_enabled\": false" "$fixture"
need "\"private_allocation_ledger_write_enabled\": false" "$fixture"
need "\"inventory_reserved_now\": false" "$fixture"
need "\"void_transfer_now\": false" "$fixture"

need "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1" "$src"
need "/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1.json" "$src"
need "/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1" "$src"
need "/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1" "$src"
need "allowed_later_after_all_activation_gates_green" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1.json",' "$src" | wc -l)" = "1"
test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1",' "$src" | wc -l)" = "1"

bad "automatic_fulfillment_enabled_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"
bad "\"automatic_fulfillment_enabled_now\": true" "$fixture"
bad "\"automatic_fulfillment_enabled\": true" "$fixture"
bad "\"private_allocation_ledger_write_enabled\": true" "$fixture"
bad "\"inventory_reserved_now\": true" "$fixture"
bad "\"void_transfer_now\": true" "$fixture"

echo "evidence_link_notice_source_green=true"
echo "evidence_link_notice_fixture_green=true"
echo "evidence_link_notice_routes_green=true"
echo "evidence_link_notice_automatic_target_false_now_green=true"
echo "evidence_link_notice_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1_GREEN"
