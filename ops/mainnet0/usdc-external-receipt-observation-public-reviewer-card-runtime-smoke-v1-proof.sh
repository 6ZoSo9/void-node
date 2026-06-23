#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1_PROOF_BEGIN"

BASE_URLS="${VOID_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_BASE_URLS:-http://127.0.0.1:4100}"
json_path="/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1.json"
html_path="/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

need_file(){ grep -qF "$1" "$2" || { echo "missing=$1 file=$2"; exit 1; }; }

python_check_json='
import json, sys
p=sys.argv[1]
d=json.load(open(p))
assert d["marker"] == "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1"
assert d["status"] == "public_reviewer_card_defined_authority_false"
assert d["public_explanation_only"] is True
assert d["parent_result_envelope_marker"] == "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1"
assert d["parent_job_envelope_marker"] == "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1"
assert d["parent_queue_marker"] == "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1"
claim=d["observed_receipt_claim"]
assert claim["chain_id"] == 8453
assert claim["receipt_found"] is True
assert claim["receipt_status"] == "0x1"
assert claim["classification_state"] == "observed_receipt_success"
warnings=d["reviewer_warnings"]
for k in [
  "not_payment_approval",
  "not_finality_verification",
  "not_allocation_ledger_write",
  "not_inventory_reserve",
  "not_automatic_fulfillment",
  "not_void_transfer",
  "operator_review_required",
]:
    assert warnings[k] is True, k
for k in [
  "public_mutation_enabled",
  "runtime_queue_enabled",
  "live_fetch_now",
  "finality_verified_now",
  "external_state_root_trust_enabled",
  "real_payment_verified_now",
  "automatic_fulfillment_enabled",
  "private_allocation_ledger_write_enabled",
  "inventory_reserved_now",
  "void_transfer_now",
]:
    assert d[k] is False, k
'

i=0
for base in $BASE_URLS; do
  i=$((i+1))
  clean_base="${base%/}"
  json_url="${clean_base}${json_path}"
  html_url="${clean_base}${html_path}"
  json_file="$tmpdir/reviewer-card-$i.json"
  html_file="$tmpdir/reviewer-card-$i.html"

  echo "smoke_base=$clean_base"

  curl -fsS "$json_url" -o "$json_file"
  python3 -c "$python_check_json" "$json_file"

  curl -fsS "$html_url" -o "$html_file"
  need_file "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1" "$html_file"
  need_file "public_reviewer_card_defined_authority_false" "$html_file"
  need_file "Not payment approval" "$html_file"
  need_file "Not finality verification" "$html_file"
  need_file "Not allocation ledger write" "$html_file"
  need_file "Not inventory reserve" "$html_file"
  need_file "Not automatic fulfillment" "$html_file"
  need_file "Not VOID transfer" "$html_file"
  need_file "Operator review required" "$html_file"
  need_file "no public mutation" "$html_file"
  need_file "no runtime queue execution" "$html_file"
  need_file "no finality verification" "$html_file"
  need_file "no real payment verification" "$html_file"
  need_file "no allocation ledger write" "$html_file"
  need_file "no inventory reserve" "$html_file"
  need_file "no automatic fulfillment" "$html_file"
  need_file "no VOID transfer" "$html_file"

  echo "runtime_smoke_base_green=$clean_base"
done

test "$i" -ge 1

echo "public_reviewer_card_json_runtime_green=true"
echo "public_reviewer_card_html_runtime_green=true"
echo "public_reviewer_card_runtime_authority_false_green=true"
echo "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1_GREEN"
