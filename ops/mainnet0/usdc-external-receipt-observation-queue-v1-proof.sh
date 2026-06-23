#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-external-receipt-observation-queue-v1.md"
fixture="fixtures/public/usdc-external-receipt-observation-queue-v1.json"
classifier="ops/mainnet0/usdc-external-receipt-observation-queue-v1.py"

need(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

test "$(grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-queue-v1.json"' "$src" | wc -l)" = "1"

python3 "$classifier" | grep -qF "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1_GREEN"

need "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1" "$src"
need "/public-node/usdc-void-buy-pool/external-receipt-observation-queue-v1.json" "$src"
need "receipt_observation_queue_defined_authority_false" "$src"
need "queue_definition_only: true" "$src"
need "endpoint_blocked_403_no_retry" "$src"
need "rate_limited_429_backoff" "$src"
need "timeout_retry_backoff" "$src"
need "rpc_error_hold" "$src"
need "operator_review_required" "$src"
need "public_mutation_enabled: false" "$src"
need "live_fetch_now: false" "$src"
need "finality_verified_now: false" "$src"
need "external_state_root_trust_enabled: false" "$src"
need "real_payment_verified_now: false" "$src"
need "automatic_fulfillment_enabled: false" "$src"
need "private_allocation_ledger_write_enabled: false" "$src"
need "inventory_reserved_now: false" "$src"
need "void_transfer_now: false" "$src"

need "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1" "$doc"
need "Classification rules" "$doc"
need "Non-activation statement" "$doc"

need "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1" "$fixture"
need "endpoint_blocked_403_no_retry" "$fixture"
need "rate_limited_429_backoff" "$fixture"
need "timeout_retry_backoff" "$fixture"
need "rpc_error_hold" "$fixture"

need "def classify(job):" "$classifier"
need "http_status == 403" "$classifier"
need "http_status == 429" "$classifier"
need "timeout_retry_backoff" "$classifier"
need "receipt_observation_queue_authority_false_green=true" "$classifier"

bad "public_mutation_enabled: true" "$src"
bad "live_fetch_now: true" "$src"
bad "finality_verified_now: true" "$src"
bad "external_state_root_trust_enabled: true" "$src"
bad "real_payment_verified_now: true" "$src"
bad "automatic_fulfillment_enabled: true" "$src"
bad "private_allocation_ledger_write_enabled: true" "$src"
bad "inventory_reserved_now: true" "$src"
bad "void_transfer_now: true" "$src"

bad '"public_mutation_enabled": true' "$fixture"
bad '"live_fetch_now": true' "$fixture"
bad '"finality_verified_now": true' "$fixture"
bad '"external_state_root_trust_enabled": true' "$fixture"
bad '"real_payment_verified_now": true' "$fixture"
bad '"automatic_fulfillment_enabled": true' "$fixture"
bad '"private_allocation_ledger_write_enabled": true' "$fixture"
bad '"inventory_reserved_now": true' "$fixture"
bad '"void_transfer_now": true' "$fixture"

echo "queue_classifier_source_green=true"
echo "queue_fixture_states_green=true"
echo "queue_route_duplicate_count_green=true"
echo "queue_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1_GREEN"
