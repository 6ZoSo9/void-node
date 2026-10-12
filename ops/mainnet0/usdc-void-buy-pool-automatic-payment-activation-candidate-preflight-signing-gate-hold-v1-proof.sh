#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-signing-gate-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_SIGNING_GATE_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "signing_gate_hold_files_and_marker_green=true"

python3 - <<'PY2'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-signing-gate-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_SIGNING_GATE_HOLD_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_signing_gate_held"
assert j["scope"] == "private_operator_only_signing_gate_hold_not_signature_creation"
assert j["void_transfer_gate_status"] == "activation_candidate_preflight_void_transfer_gate_held"
assert j["next_required_gate"] == "activation_candidate_preflight_execution_performed_gate_hold_v1"
assert len(j["gate_hold_checks"]) == 21

g = j["signing_gate"]
assert g["gate_exists"] is True
assert g["gate_state"] == "held_closed"
for key in [
  "signing_performed",
  "signature_created",
  "signing_payload_created",
  "private_key_accessed",
]:
    assert g[key] is False, key

b = j["boundary"]
assert b["signing_gate_hold"] is True
assert b["void_transfer_gate_hold_complete"] is True
assert b["execution_plan_only"] is True

for key in [
  "automatic_fulfillment_enabled",
  "wallet_fulfillment_enabled",
  "signer_access_granted",
  "terminal_execute_authorized",
  "actual_execute_authorized",
  "execution_performed",
  "signing_performed",
  "signature_created",
  "signing_payload_created",
  "private_key_accessed",
  "void_transfer_performed",
  "void_debit_created",
  "void_credit_created",
  "transfer_instruction_materialized",
  "transaction_broadcast",
  "broadcast_payload_created",
  "rpc_send_enabled",
  "tx_hash_created",
  "fulfilled_state_written",
  "public_mutation_route_created",
]:
    assert b[key] is False, key

print("signing_gate_hold_fixture_green=true")
print("signing_gate_held_closed_green=true")
print("signing_gate_hold_boundary_green=true")
PY2

grep -RInF 'git status --short' "$doc" "$fixture" && exit 1 || true
grep -RInF 'zoso@' "$doc" "$fixture" && exit 1 || true
echo "signing_gate_hold_contamination_absent=true"

echo "signing_gate_hold_no_signing=true"
echo "signing_gate_hold_no_signature=true"
echo "signing_gate_hold_no_signing_payload=true"
echo "signing_gate_hold_no_private_key_access=true"
echo "signing_gate_hold_no_void_transfer=true"
echo "signing_gate_hold_no_transaction_broadcast=true"
echo "${marker}_GREEN"
