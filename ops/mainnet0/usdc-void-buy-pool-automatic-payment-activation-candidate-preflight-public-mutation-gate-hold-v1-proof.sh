#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-public-mutation-gate-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_PUBLIC_MUTATION_GATE_HOLD_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "public_mutation_gate_hold_files_and_marker_green=true"

python3 - <<'PY2'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-public-mutation-gate-hold-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_PUBLIC_MUTATION_GATE_HOLD_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_public_mutation_gate_held"
assert j["scope"] == "private_operator_only_public_mutation_gate_hold_not_runtime_route"
assert j["automatic_fulfillment_enablement_gate_status"] == "activation_candidate_preflight_automatic_fulfillment_enablement_gate_held"
assert j["next_required_gate"] == "activation_candidate_preflight_fulfilled_state_write_gate_hold_v1"
assert len(j["gate_hold_checks"]) == 16

g = j["public_mutation_gate"]
assert g["gate_exists"] is True
assert g["gate_state"] == "held_closed"
for key in [
  "public_mutation_route_created",
  "public_post_enabled",
  "public_put_enabled",
  "public_patch_enabled",
  "public_delete_enabled",
]:
    assert g[key] is False, key

b = j["boundary"]
assert b["public_mutation_gate_hold"] is True
assert b["automatic_fulfillment_enablement_gate_hold_complete"] is True
assert b["execution_plan_only"] is True

for key in [
  "automatic_fulfillment_enabled",
  "wallet_fulfillment_enabled",
  "signer_access_granted",
  "terminal_execute_authorized",
  "actual_execute_authorized",
  "execution_performed",
  "signing_performed",
  "void_transfer_performed",
  "transaction_broadcast",
  "fulfilled_state_written",
  "public_mutation_route_created",
  "public_post_enabled",
  "public_put_enabled",
  "public_patch_enabled",
  "public_delete_enabled",
]:
    assert b[key] is False, key

print("public_mutation_gate_hold_fixture_green=true")
print("public_mutation_gate_held_closed_green=true")
print("public_mutation_gate_hold_boundary_green=true")
PY2

grep -RInF 'git status --short' "$doc" "$fixture" && exit 1 || true
grep -RInF 'zoso@' "$doc" "$fixture" && exit 1 || true
echo "public_mutation_gate_hold_contamination_absent=true"

echo "public_mutation_gate_hold_no_public_mutation_route=true"
echo "public_mutation_gate_hold_no_public_post=true"
echo "public_mutation_gate_hold_no_public_put=true"
echo "public_mutation_gate_hold_no_public_patch=true"
echo "public_mutation_gate_hold_no_public_delete=true"
echo "public_mutation_gate_hold_no_automatic_fulfillment=true"
echo "public_mutation_gate_hold_no_fulfilled_state=true"
echo "${marker}_GREEN"
