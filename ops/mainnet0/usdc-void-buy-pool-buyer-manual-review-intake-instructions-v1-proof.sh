#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-buyer-manual-review-intake-instructions-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-manual-review-intake-instructions-v1.json"

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

bad_json_true() {
  local field="$1"
  local file="$2"
  if grep -Eq "\"${field}\"[[:space:]]*:[[:space:]]*true" "$file"; then
    echo "forbidden_json_field_true=${field} file=${file}" >&2
    exit 1
  fi
}

bad_ts_true() {
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

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1"
assert data["status"] == "buyer_manual_review_intake_instructions_green"

fields = data["intake_packet_fields"]
assert fields["chain_name_required"] is True
assert fields["transaction_hash_required"] is True
assert fields["usdc_amount_required"] is True
assert fields["sending_wallet_address_required"] is True
assert fields["receiving_void_wallet_address_required"] is True
assert fields["buyer_acknowledges_manual_review_required"] is True
assert fields["optional_private_contact_path_allowed_only_privately"] is True

blocked = data["public_do_not_submit"]
assert blocked["seed_phrase"] is True
assert blocked["private_key"] is True
assert blocked["password"] is True
assert blocked["secret_material"] is True
assert blocked["private_contact_info_on_public_node"] is True

req = data["manual_review_requirements"]
assert req["payment_verification_required"] is True
assert req["duplicate_payment_guard_required"] is True
assert req["buyer_identity_binding_required"] is True
assert req["finality_confirmations_required"] is True
assert req["operator_review_required"] is True

state = data["current_authority_state"]
for k, v in state.items():
    assert v is False, (k, v)

proof = data["proof_expectations"]
assert proof["buyer_manual_review_intake_instructions_green"] is True
assert proof["manual_review_packet_shape_green"] is True
assert proof["public_secret_warning_green"] is True
assert proof["manual_review_requirements_green"] is True
assert proof["authority_false_green"] is True
PY

echo "buyer_manual_review_intake_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1" "$doc"
need "transaction hash" "$doc"
need "receiving VOID wallet address" "$doc"
need "Do not post seed phrases" "$doc"
need "Manual review requires payment verification" "$doc"

echo "buyer_manual_review_intake_doc_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1" "$src"
need "buyer_manual_review_intake_instructions_green" "$src"
need "transaction_hash_required: true" "$src"
need "receiving_void_wallet_address_required: true" "$src"
need "buyer_acknowledges_manual_review_required: true" "$src"
need "payment_verification_required: true" "$src"
need "operator_review_required: true" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "wallet_fulfillment_enabled_now: false" "$src"
need "public_mutation_enabled_now: false" "$src"
need "void_transfer_now: false" "$src"
need "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_MOUNT_ROUTES" "$src"
need "__void_http_app" "$src"

echo "buyer_manual_review_intake_source_green=true"

need '"transaction_hash_required": true' "$fixture"
need '"receiving_void_wallet_address_required": true' "$fixture"
need '"buyer_acknowledges_manual_review_required": true' "$fixture"
need '"payment_verification_required": true' "$fixture"
need '"operator_review_required": true' "$fixture"
need '"automatic_fulfillment_enabled_now": false' "$fixture"
need '"public_mutation_enabled_now": false' "$fixture"
need '"void_transfer_now": false' "$fixture"

echo "buyer_manual_review_intake_fixture_green=true"

json_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-intake-instructions-v1.json", (_req:any, res:any) =>' "$src" || true)"
html_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-intake-instructions-v1", (_req:any, res:any) =>' "$src" || true)"

test "$json_route_count" = "1"
test "$html_route_count" = "1"

echo "buyer_manual_review_intake_routes_green=true"

bad_ts_true "automatic_fulfillment_enabled_now" "$src"
bad_ts_true "wallet_fulfillment_enabled_now" "$src"
bad_ts_true "buyer_execution_enabled_now" "$src"
bad_ts_true "public_mutation_enabled_now" "$src"
bad_ts_true "public_node_operator_authority_active_now" "$src"
bad_ts_true "void_transfer_now" "$src"
bad_ts_true "instant_delivery_promised" "$src"
bad_ts_true "investment_return_promised" "$src"
bad_ts_true "price_appreciation_promised" "$src"

bad_json_true "automatic_fulfillment_enabled_now" "$fixture"
bad_json_true "wallet_fulfillment_enabled_now" "$fixture"
bad_json_true "buyer_execution_enabled_now" "$fixture"
bad_json_true "public_mutation_enabled_now" "$fixture"
bad_json_true "public_node_operator_authority_active_now" "$fixture"
bad_json_true "void_transfer_now" "$fixture"
bad_json_true "instant_delivery_promised" "$fixture"
bad_json_true "investment_return_promised" "$fixture"
bad_json_true "price_appreciation_promised" "$fixture"

bad "seed phrase required" "$doc"
bad "private key required" "$doc"
bad "Automatic fulfillment is active now." "$doc"
bad "instant delivery" "$doc"

echo "buyer_manual_review_intake_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_GREEN"
