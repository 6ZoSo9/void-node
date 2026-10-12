#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_RUNTIME_SMOKE_V1_PROOF_BEGIN"

BASES="${VOID_EVIDENCE_BUNDLE_RUNTIME_SMOKE_BASE_URLS:-http://127.0.0.1:4100}"

need_text(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }
bad_text(){ if grep -qF "$1" "$2"; then echo "forbidden=$1 file=$2"; exit 1; fi; }

for base in $BASES; do
  echo "smoke_base=$base"

  json_tmp="$(mktemp)"
  html_tmp="$(mktemp)"
  cleanup(){ rm -f "$json_tmp" "$html_tmp"; }
  trap cleanup EXIT

  curl -fsS "$base/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json" > "$json_tmp"
  curl -fsS "$base/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1" > "$html_tmp"

  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1" "$json_tmp"
  need_text "evidence_bundle_defined_authority_false" "$json_tmp"
  need_text "public_evidence_index_only" "$json_tmp"
  need_text "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1" "$json_tmp"
  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1" "$json_tmp"
  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1" "$json_tmp"
  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1" "$json_tmp"
  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1" "$json_tmp"
  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1" "$json_tmp"

  need_text "not_payment_approval" "$json_tmp"
  need_text "not_finality_verification" "$json_tmp"
  need_text "not_allocation_ledger_write" "$json_tmp"
  need_text "not_inventory_reserve" "$json_tmp"
  need_text "not_automatic_fulfillment" "$json_tmp"
  need_text "not_void_transfer" "$json_tmp"
  need_text "operator_review_required" "$json_tmp"

  need_text "public_mutation_enabled" "$json_tmp"
  need_text "runtime_queue_enabled" "$json_tmp"
  need_text "live_fetch_now" "$json_tmp"
  need_text "finality_verified_now" "$json_tmp"
  need_text "external_state_root_trust_enabled" "$json_tmp"
  need_text "real_payment_verified_now" "$json_tmp"
  need_text "automatic_fulfillment_enabled" "$json_tmp"
  need_text "private_allocation_ledger_write_enabled" "$json_tmp"
  need_text "inventory_reserved_now" "$json_tmp"
  need_text "void_transfer_now" "$json_tmp"

  bad_text '"public_mutation_enabled":true' "$json_tmp"
  bad_text '"runtime_queue_enabled":true' "$json_tmp"
  bad_text '"live_fetch_now":true' "$json_tmp"
  bad_text '"finality_verified_now":true' "$json_tmp"
  bad_text '"external_state_root_trust_enabled":true' "$json_tmp"
  bad_text '"real_payment_verified_now":true' "$json_tmp"
  bad_text '"automatic_fulfillment_enabled":true' "$json_tmp"
  bad_text '"private_allocation_ledger_write_enabled":true' "$json_tmp"
  bad_text '"inventory_reserved_now":true' "$json_tmp"
  bad_text '"void_transfer_now":true' "$json_tmp"

  need_text "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1" "$html_tmp"
  need_text "USDC External Receipt Observation Evidence Bundle v1" "$html_tmp"
  need_text "JSON evidence bundle" "$html_tmp"
  need_text "Receipt observation queue JSON" "$html_tmp"
  need_text "Observation job envelope JSON" "$html_tmp"
  need_text "Observation result envelope JSON" "$html_tmp"
  need_text "Public reviewer card JSON" "$html_tmp"
  need_text "Public reviewer card HTML" "$html_tmp"
  need_text "Not payment approval" "$html_tmp"
  need_text "Not finality verification" "$html_tmp"
  need_text "Not allocation ledger write" "$html_tmp"
  need_text "Not inventory reserve" "$html_tmp"
  need_text "Not automatic fulfillment" "$html_tmp"
  need_text "Not VOID transfer" "$html_tmp"
  need_text "Operator review required" "$html_tmp"
  need_text "no public mutation" "$html_tmp"
  need_text "no runtime queue execution" "$html_tmp"
  need_text "no live fetch now" "$html_tmp"
  need_text "no finality verification" "$html_tmp"
  need_text "no real payment verification" "$html_tmp"
  need_text "no allocation ledger write" "$html_tmp"
  need_text "no inventory reserve" "$html_tmp"
  need_text "no automatic fulfillment" "$html_tmp"
  need_text "no VOID transfer" "$html_tmp"

  echo "runtime_smoke_base_green=$base"

  cleanup
  trap - EXIT
done

echo "evidence_bundle_json_runtime_green=true"
echo "evidence_bundle_html_runtime_green=true"
echo "evidence_bundle_runtime_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_RUNTIME_SMOKE_V1_GREEN"
