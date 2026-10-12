#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/public-node-usdc-void-buy-pool-buyer-packet-private-intake-boundary-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-buyer-packet-private-intake-boundary-v1.json"

need() {
  local pattern="$1"
  local file="$2"
  grep -qF "$pattern" "$file" || {
    echo "missing=${pattern} file=${file}" >&2
    exit 1
  }
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

assert data["marker"] == "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1"
assert data["status"] == "buyer_packet_private_intake_boundary_green"

b = data["public_boundary"]
assert b["public_node_publishes_instructions"] is True
assert b["public_node_publishes_packet_template"] is True
assert b["private_operator_intake_required"] is True
assert b["public_node_accepts_buyer_packets"] is False
assert b["public_submission_endpoint"] is False
assert b["public_claim_creation_endpoint"] is False
assert b["public_identity_verification_endpoint"] is False
assert b["public_contact_collection_endpoint"] is False
assert b["public_fulfillment_trigger"] is False
assert b["public_wallet_action"] is False
assert b["public_ledger_mutation"] is False

private = data["private_operator_channel"]
assert private["separate_operator_controlled_channel_required"] is True
assert private["private_contact_info_allowed_only_privately"] is True
assert private["secret_material_allowed"] is False
assert private["seed_phrase_allowed"] is False
assert private["private_key_allowed"] is False

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
assert proof["buyer_packet_private_intake_boundary_green"] is True
assert proof["private_operator_intake_required_green"] is True
assert proof["public_submission_disabled_green"] is True
assert proof["no_public_claim_creation_green"] is True
assert proof["no_public_wallet_action_green"] is True
assert proof["no_public_mutation_green"] is True
assert proof["authority_false_green"] is True
PY

echo "buyer_packet_private_intake_boundary_json_semantics_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1" "$doc"
need "private/operator intake only" "$doc"
need "the public node does not accept buyer packets" "$doc"
need "the public node does not create claims" "$doc"
need "the public node does not trigger fulfillment" "$doc"
need "the public node does not perform wallet actions" "$doc"
need "the public node does not mutate ledgers" "$doc"

echo "buyer_packet_private_intake_boundary_doc_green=true"

need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1" "$src"
need "buyer_packet_private_intake_boundary_green" "$src"
need "private_operator_intake_required: true" "$src"
need "public_node_accepts_buyer_packets: false" "$src"
need "public_submission_endpoint: false" "$src"
need "public_claim_creation_endpoint: false" "$src"
need "public_wallet_action: false" "$src"
need "public_ledger_mutation: false" "$src"
need "automatic_fulfillment_enabled_now: false" "$src"
need "public_mutation_enabled_now: false" "$src"
need "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_MOUNT_ROUTES" "$src"
need "__void_http_app" "$src"

echo "buyer_packet_private_intake_boundary_source_green=true"

need '"private_operator_intake_required": true' "$fixture"
need '"public_node_accepts_buyer_packets": false' "$fixture"
need '"public_submission_endpoint": false' "$fixture"
need '"public_claim_creation_endpoint": false' "$fixture"
need '"public_wallet_action": false' "$fixture"
need '"public_ledger_mutation": false' "$fixture"
need '"automatic_fulfillment_enabled_now": false' "$fixture"
need '"public_mutation_enabled_now": false' "$fixture"
need '"void_transfer_now": false' "$fixture"

echo "buyer_packet_private_intake_boundary_fixture_green=true"

json_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/buyer-packet-private-intake-boundary-v1.json", (_req:any, res:any) =>' "$src" || true)"
html_route_count="$(grep -cF 'APP.get("/public-node/usdc-void-buy-pool/buyer-packet-private-intake-boundary-v1", (_req:any, res:any) =>' "$src" || true)"

test "$json_route_count" = "1"
test "$html_route_count" = "1"

echo "buyer_packet_private_intake_boundary_routes_green=true"

bad_ts_true "public_node_accepts_buyer_packets" "$src"
bad_ts_true "public_submission_endpoint" "$src"
bad_ts_true "public_claim_creation_endpoint" "$src"
bad_ts_true "public_identity_verification_endpoint" "$src"
bad_ts_true "public_contact_collection_endpoint" "$src"
bad_ts_true "public_fulfillment_trigger" "$src"
bad_ts_true "public_wallet_action" "$src"
bad_ts_true "public_ledger_mutation" "$src"
bad_ts_true "secret_material_allowed" "$src"
bad_ts_true "seed_phrase_allowed" "$src"
bad_ts_true "private_key_allowed" "$src"
bad_ts_true "automatic_fulfillment_enabled_now" "$src"
bad_ts_true "wallet_fulfillment_enabled_now" "$src"
bad_ts_true "buyer_execution_enabled_now" "$src"
bad_ts_true "public_mutation_enabled_now" "$src"
bad_ts_true "public_node_operator_authority_active_now" "$src"
bad_ts_true "void_transfer_now" "$src"

bad_json_true "public_node_accepts_buyer_packets" "$fixture"
bad_json_true "public_submission_endpoint" "$fixture"
bad_json_true "public_claim_creation_endpoint" "$fixture"
bad_json_true "public_identity_verification_endpoint" "$fixture"
bad_json_true "public_contact_collection_endpoint" "$fixture"
bad_json_true "public_fulfillment_trigger" "$fixture"
bad_json_true "public_wallet_action" "$fixture"
bad_json_true "public_ledger_mutation" "$fixture"
bad_json_true "secret_material_allowed" "$fixture"
bad_json_true "seed_phrase_allowed" "$fixture"
bad_json_true "private_key_allowed" "$fixture"
bad_json_true "automatic_fulfillment_enabled_now" "$fixture"
bad_json_true "wallet_fulfillment_enabled_now" "$fixture"
bad_json_true "buyer_execution_enabled_now" "$fixture"
bad_json_true "public_mutation_enabled_now" "$fixture"
bad_json_true "public_node_operator_authority_active_now" "$fixture"
bad_json_true "void_transfer_now" "$fixture"

echo "buyer_packet_private_intake_boundary_authority_false_green=true"

echo "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_GREEN"
