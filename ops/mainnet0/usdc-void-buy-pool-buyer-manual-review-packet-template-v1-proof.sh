#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-buyer-manual-review-packet-template-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-manual-review-packet-template-v1.json"

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
if grep -Eq ""${field}"[[:space:]]*:[[:space:]]*true" "$file"; then
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

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1"
assert data["status"] == "buyer_manual_review_packet_template_green"

surface = data["template_surface"]
assert surface["public_template_only"] is True
assert surface["public_submission_form"] is False
assert surface["public_submit_endpoint"] is False
assert surface["claim_creation_endpoint"] is False
assert surface["automatic_fulfillment_trigger"] is False
assert surface["wallet_action"] is False
assert surface["public_mutation_route"] is False

template = data["buyer_packet_template_fields"]
assert "manual operator review" in template["buyer_acknowledgment"]
assert "private/operator channels" in template["private_contact_path"]

required = data["required_fields"]
assert required["chain_required"] is True
assert required["transaction_hash_required"] is True
assert required["usdc_amount_required"] is True
assert required["sending_wallet_address_required"] is True
assert required["receiving_void_wallet_address_required"] is True
assert required["buyer_acknowledgment_required"] is True

blocked = data["public_do_not_include"]
assert blocked["seed_phrase"] is True
assert blocked["private_key"] is True
assert blocked["password"] is True
assert blocked["signature_secret"] is True
assert blocked["private_contact_info_on_public_node"] is True
assert blocked["secret_material"] is True

state = data["current_authority_state"]
for k, v in state.items():
    assert v is False, (k, v)

proof = data["proof_expectations"]
assert proof["buyer_manual_review_packet_template_green"] is True
assert proof["template_surface_only_green"] is True
assert proof["no_public_submission_green"] is True
assert proof["manual_review_requirements_green"] is True
assert proof["authority_false_green"] is True

PY

echo "buyer_manual_review_packet_template_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1" "$doc"
need "VOID USDC/VOID Manual Review Packet" "$doc"
need "Transaction hash:" "$doc"
need "Receiving VOID wallet address:" "$doc"
need "not a public form" "$doc"
need "not an automatic fulfillment trigger" "$doc"

echo "buyer_manual_review_packet_template_doc_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1" "$src"
need "buyer_manual_review_packet_template_green" "$src"
need "public_template_only: true" "$src"
need "public_submission_form: false" "$src"
need "public_submit_endpoint: false" "$src"
need "claim_creation_endpoint: false" "$src"
need "automatic_fulfillment_trigger: false" "$src"
need "wallet_action: false" "$src"
need "public_mutation_route: false" "$src"
need "VOID USDC/VOID Manual Review Packet" "$src"
need "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_MOUNT_ROUTES" "$src"
need "__void_http_app" "$src"

echo "buyer_manual_review_packet_template_source_green=true"

need '"public_template_only": true' "$fixture"
need '"public_submission_form": false' "$fixture"
need '"public_submit_endpoint": false' "$fixture"
need '"claim_creation_endpoint": false' "$fixture"
need '"automatic_fulfillment_trigger": false' "$fixture"
need '"wallet_action": false' "$fixture"
need '"public_mutation_route": false' "$fixture"
need '"transaction_hash_required": true' "$fixture"
need '"receiving_void_wallet_address_required": true' "$fixture"
need '"automatic_fulfillment_enabled_now": false' "$fixture"
need '"public_mutation_enabled_now": false' "$fixture"
need '"void_transfer_now": false' "$fixture"

echo "buyer_manual_review_packet_template_fixture_green=true"

json_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-packet-template-v1.json", (_req:any, res:any) =>' "$src" || true)"
html_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-packet-template-v1", (_req:any, res:any) =>' "$src" || true)"

test "$json_route_count" = "1"
test "$html_route_count" = "1"

echo "buyer_manual_review_packet_template_routes_green=true"

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

bad "public submission form: true" "$src"
bad "public submit endpoint: true" "$src"
bad "claim creation endpoint: true" "$src"
bad "automatic fulfillment trigger: true" "$src"
bad "wallet action: true" "$src"
bad "public mutation route: true" "$src"

echo "buyer_manual_review_packet_template_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_GREEN"
