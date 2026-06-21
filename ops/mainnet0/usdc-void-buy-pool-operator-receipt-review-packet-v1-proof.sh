#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1_PROOF_BEGIN"

doc="docs/private/usdc-void-buy-pool-operator-receipt-review-packet-v1.md"
src="src/index.ts"

test -f "$doc"

grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1" "$doc" >/dev/null
grep -F "private_operator_review_packet_only" "$doc" >/dev/null
grep -F "public receipt intake endpoint" "$doc" >/dev/null
grep -F "public receipt mutation route" "$doc" >/dev/null
grep -F "automatic receipt acceptance path" "$doc" >/dev/null
grep -F "automatic fulfillment path" "$doc" >/dev/null
grep -F "public buyer queue" "$doc" >/dev/null
grep -F "wallet send action" "$doc" >/dev/null
grep -F "private key action" "$doc" >/dev/null
grep -F "investment return, yield, or profit promise" "$doc" >/dev/null

grep -F "Base USDC transaction hash" "$doc" >/dev/null
grep -F "exact sending wallet address" "$doc" >/dev/null
grep -F "USDC amount sent" "$doc" >/dev/null
grep -F "receiver_address" "$doc" >/dev/null
grep -F "send_time_or_block" "$doc" >/dev/null
grep -F "wallet_proof" "$doc" >/dev/null

grep -F "accepted_chain = base" "$doc" >/dev/null
grep -F "Transfer is USDC" "$doc" >/dev/null
grep -F "Receiver matches the current configured VOID buy-pool receiving address" "$doc" >/dev/null
grep -F "Sender wallet is the receipt identity" "$doc" >/dev/null
grep -F "centralized exchange, pooled custody service, bridge, payment processor" "$doc" >/dev/null
grep -F "0.50 USDC per VOID" "$doc" >/dev/null
grep -F "2 VOID per 1 USDC" "$doc" >/dev/null
grep -F "10,000,000 VOID" "$doc" >/dev/null
grep -F "5,000,000 USDC" "$doc" >/dev/null
grep -F "Duplicate check" "$doc" >/dev/null
grep -F "Redaction check" "$doc" >/dev/null
grep -F "Decision record check" "$doc" >/dev/null

grep -F "not_reviewed" "$doc" >/dev/null
grep -F "needs_more_info" "$doc" >/dev/null
grep -F "invalid_wrong_chain" "$doc" >/dev/null
grep -F "invalid_wrong_asset" "$doc" >/dev/null
grep -F "invalid_receiver" "$doc" >/dev/null
grep -F "invalid_exchange_or_pooled_sender" "$doc" >/dev/null
grep -F "duplicate_tx_hash" "$doc" >/dev/null
grep -F "valid_receipt_candidate" "$doc" >/dev/null
grep -F "ready_for_separate_operator_fulfillment_review" "$doc" >/dev/null
grep -F "rejected" "$doc" >/dev/null

grep -F "candidate_void_amount = amount_usdc / 0.50" "$doc" >/dev/null
grep -F "candidate_void_amount = amount_usdc * 2" "$doc" >/dev/null

grep -F "public_receipt_intake_endpoint_open = false" "$doc" >/dev/null
grep -F "public_receipt_mutation_enabled = false" "$doc" >/dev/null
grep -F "automatic_receipt_acceptance_enabled = false" "$doc" >/dev/null
grep -F "automatic_fulfillment_enabled = false" "$doc" >/dev/null
grep -F "wallet_send_enabled = false" "$doc" >/dev/null
grep -F "private_key_action_enabled = false" "$doc" >/dev/null
grep -F "public_queue_exposed = false" "$doc" >/dev/null
grep -F "secret_exposure_allowed = false" "$doc" >/dev/null
grep -F "route_added = false" "$doc" >/dev/null
grep -F "src_index_modified = false" "$doc" >/dev/null

# Must not add runtime/public route marker to src/index.ts.
if grep -F "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1" "$src" >/dev/null; then
  echo "STOP: private operator review packet marker unexpectedly present in runtime src."
  exit 1
fi

# Must not add new routes; public safety count remains 175.
grep -F "public_literal_get_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_unique_count=175" docs/public/public-surface-safety-index-v1.md >/dev/null
grep -F "public_literal_get_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null
grep -F "public_literal_get_unique_count=175" ops/mainnet0/public-surface-safety-index-v1-proof.sh >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: lowercase public-node mutation route detected."
  exit 1
fi

if grep -E "APP\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: uppercase public-node mutation route detected."
  exit 1
fi

echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1_ASSERT_GREEN"
echo "VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1_GREEN"
