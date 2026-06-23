#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-public-manual-fulfillment-truth-notice-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-public-manual-fulfillment-truth-notice-v1.json"

need() {
  local pattern="$1"
  local file="$2"
  grep -qF "$pattern" "$file" || {
    echo "missing=${pattern} file=${file}" >&2
    exit 1
  }
}

bad() {
  local pattern="$1"
  local file="$2"
  if grep -qF "$pattern" "$file"; then
    echo "forbidden=${pattern} file=${file}" >&2
    exit 1
  fi
}

bad_field_true_ts() {
  local field="$1"
  local file="$2"
  if grep -Eq "^[[:space:]]*${field}:[[:space:]]*true[[:space:],}]" "$file"; then
    echo "forbidden_ts_field_true=${field} file=${file}" >&2
    exit 1
  fi
}

test -f "$src"
test -f "$doc"
test -f "$fixture"

python3 - "$fixture" <<'PY'
import json, sys
p = sys.argv[1]
with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1"
assert data["status"] == "public_manual_fulfillment_truth_notice_green"

truth = data["truth_notice"]
assert truth["receiver_address_can_receive_usdc"] is True
assert truth["verified_payment_can_enter_manual_operator_review"] is True
assert truth["manual_operator_fulfillment_possible_after_verification"] is True
assert truth["automatic_fulfillment_enabled_now"] is False
assert truth["wallet_fulfillment_enabled_now"] is False
assert truth["buyer_execution_enabled_now"] is False
assert truth["public_mutation_enabled_now"] is False
assert truth["public_node_operator_authority_active_now"] is False
assert truth["void_transfer_now"] is False
assert truth["instant_delivery_promised"] is False
assert truth["investment_return_promised"] is False
assert truth["price_appreciation_promised"] is False
assert truth["secondary_market_outcome_promised"] is False

boundary = data["public_safety_boundary"]
for k, v in boundary.items():
    assert v is False, (k, v)

proof = data["proof_expectations"]
assert proof["public_manual_fulfillment_truth_notice_green"] is True
assert proof["receiver_truth_green"] is True
assert proof["automatic_fulfillment_false_now_green"] is True
assert proof["manual_review_truth_green"] is True
assert proof["manual_fulfillment_truth_green"] is True
assert proof["authority_false_green"] is True
PY

echo "public_manual_fulfillment_truth_notice_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1" "$doc"
need "The listed USDC receiver address can receive external USDC transfers." "$doc"
need "Automatic fulfillment is not active now." "$doc"
need "A verified USDC payment can still enter manual operator review." "$doc"
need "This notice does not promise investment return" "$doc"

echo "public_manual_fulfillment_truth_notice_doc_green=true"

need "VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1" "$src"
need "public_manual_fulfillment_truth_notice_green" "$src"
need "receiver_address_can_receive_usdc: true" "$src"
need "verified_payment_can_enter_manual_operator_review: true" "$src"
need "manual_operator_fulfillment_possible_after_verification: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "wallet_fulfillment_enabled_now: false" "$src"
need "buyer_execution_enabled_now: false" "$src"
need "public_mutation_enabled_now: false" "$src"
need "public_node_operator_authority_active_now: false" "$src"
need "void_transfer_now: false" "$src"
need "instant_delivery_promised: false" "$src"
need "investment_return_promised: false" "$src"
need "price_appreciation_promised: false" "$src"

echo "public_manual_fulfillment_truth_notice_source_green=true"

need '"receiver_address_can_receive_usdc": true' "$fixture"
need '"manual_operator_fulfillment_possible_after_verification": true' "$fixture"
need '"automatic_fulfillment_enabled_now": false' "$fixture"
need '"public_mutation_enabled_now": false' "$fixture"
need '"void_transfer_now": false' "$fixture"

echo "public_manual_fulfillment_truth_notice_fixture_green=true"

json_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/public-manual-fulfillment-truth-notice-v1.json"' "$src" || true)"
html_route_count="$(grep -cF 'app.get("/public-node/usdc-void-buy-pool/public-manual-fulfillment-truth-notice-v1"' "$src" || true)"

test "$json_route_count" = "1"
test "$html_route_count" = "1"

echo "public_manual_fulfillment_truth_notice_routes_green=true"

bad_field_true_ts "automatic_fulfillment_enabled_now" "$src"
bad_field_true_ts "wallet_fulfillment_enabled_now" "$src"
bad_field_true_ts "buyer_execution_enabled_now" "$src"
bad_field_true_ts "public_mutation_enabled_now" "$src"
bad_field_true_ts "public_node_operator_authority_active_now" "$src"
bad_field_true_ts "void_transfer_now" "$src"
bad_field_true_ts "instant_delivery_promised" "$src"
bad_field_true_ts "investment_return_promised" "$src"
bad_field_true_ts "price_appreciation_promised" "$src"

bad '"automatic_fulfillment_enabled_now": true' "$fixture"
bad '"wallet_fulfillment_enabled_now": true' "$fixture"
bad '"buyer_execution_enabled_now": true' "$fixture"
bad '"public_mutation_enabled_now": true' "$fixture"
bad '"public_node_operator_authority_active_now": true' "$fixture"
bad '"void_transfer_now": true' "$fixture"
bad '"instant_delivery_promised": true' "$fixture"
bad '"investment_return_promised": true' "$fixture"
bad '"price_appreciation_promised": true' "$fixture"

echo "public_manual_fulfillment_truth_notice_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_GREEN"
