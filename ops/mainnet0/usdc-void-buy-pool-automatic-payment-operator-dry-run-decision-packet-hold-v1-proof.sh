#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_PACKET_HOLD_V1"
doc="docs/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-packet-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-packet-hold-v1.json"
src="src/index.ts"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"

echo "automatic_payment_operator_dry_run_decision_packet_hold_doc_green=true"
echo "automatic_payment_operator_dry_run_decision_packet_hold_fixture_green=true"

python3 - "$fixture" <<'PY'
import json
import sys

j = json.load(open(sys.argv[1]))

def require(cond, msg):
    if not cond:
        raise SystemExit(msg)

marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_PACKET_HOLD_V1"

require(j.get("marker") == marker, "bad marker")
require(j.get("status") == "operator_private_dry_run_decision_packet_hold", "bad status")
require(j.get("visibility") == "private_operator_only", "bad visibility")
require(j.get("public_route") is False, "public_route must be false")
require(j.get("public_safe") is False, "public_safe must be false")
require(j.get("private_buyer_or_payment_material_exposed") is False, "private material exposure must be false")
require(j.get("dry_run_only") is True, "dry_run_only must be true")

required_input = [
    "chain_id",
    "tx_hash",
    "transfer_log_index",
    "usdc_token",
    "receiver",
    "from",
    "amount_usdc_atomic",
    "buyer_opaque_key",
    "void_delivery_address",
    "observed_block_number",
    "observed_confirmations",
    "receipt_status",
]
for key in required_input:
    require(key in j["candidate_input_shape"], "missing input shape key " + key)

required_states = [
    "blocked_missing_receipt",
    "blocked_receipt_status_not_success",
    "blocked_transfer_log_missing",
    "blocked_chain_token_receiver_allowlist",
    "blocked_finality_confirmations",
    "blocked_duplicate_payment_identity",
    "blocked_amount_rate_policy",
    "blocked_buyer_identity_binding",
    "blocked_inventory_capacity",
    "candidate_payment_eligible_dry_run_only",
    "blocked_authority_false",
]
for state in required_states:
    require(state in j["allowed_decision_states"], "missing decision state " + state)

require(j["canonical_payment_identity"]["format"] == "chain_id:tx_hash:transfer_log_index", "bad canonical identity format")
require(j["canonical_payment_identity"]["used_for_duplicate_guard"] is True, "duplicate guard identity must be true")
require(j["canonical_payment_identity"]["request_id_alone_is_not_payment_identity"] is True, "request id alone must not be identity")

for key, value in j["authority"].items():
    require(value is False, "authority " + key + " must be false")

print("automatic_payment_operator_dry_run_decision_packet_hold_json_semantics_green=true")
print("automatic_payment_operator_dry_run_decision_packet_hold_authority_false_green=true")
PY

if grep -Fq "$marker" "$src"; then
  echo "private dry-run marker unexpectedly leaked into src/index.ts" >&2
  exit 1
fi

if grep -R --line-number "$marker" docs/public fixtures/public 2>/dev/null; then
  echo "private dry-run marker unexpectedly leaked into public docs/fixtures" >&2
  exit 1
fi

if grep -E 'app\.(get|post|put|patch|delete)\("/public-node/usdc-void-buy-pool/automatic-payment-operator-dry-run-decision-packet' "$src"; then
  echo "unexpected public route for private dry-run decision packet" >&2
  exit 1
fi

echo "automatic_payment_operator_dry_run_decision_packet_hold_private_no_src_leak_green=true"
echo "automatic_payment_operator_dry_run_decision_packet_hold_no_public_route_green=true"

echo "${marker}_GREEN"
