#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-execution-plan-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_EXECUTION_PLAN_V1"

doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
echo "activation_candidate_preflight_execution_plan_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "activation_candidate_preflight_execution_plan_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-execution-plan-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_EXECUTION_PLAN_V1"

j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_execution_plan_ready"
assert j["scope"] == "private_operator_only_execution_plan_not_execution"
assert j["precision_source_of_truth"] is True
assert j["next_required_gate"] == "activation_candidate_preflight_verification_sources_v1"
assert len(j["source_chain"]) == 6
assert len(j["required_next_checks"]) == 10

for label, path in j["source_chain"].items():
    assert Path(path).exists(), f"missing source {label}: {path}"

b = j["boundary"]
assert b["activation_candidate_planning"] is True
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
]:
    assert b[key] is False, key

print("activation_candidate_preflight_execution_plan_fixture_green=true")
print("activation_candidate_preflight_execution_plan_source_chain_green=true")
print("activation_candidate_preflight_execution_plan_boundary_green=true")
PY

grep -RInF 'git status --short' "$doc" "$fixture" && exit 1 || true
grep -RInF 'zoso@' "$doc" "$fixture" && exit 1 || true
echo "activation_candidate_preflight_execution_plan_contamination_absent=true"

echo "activation_candidate_preflight_execution_plan_no_signer_access=true"
echo "activation_candidate_preflight_execution_plan_no_transfer=true"
echo "activation_candidate_preflight_execution_plan_no_broadcast=true"
echo "activation_candidate_preflight_execution_plan_no_fulfilled_state=true"
echo "${marker}_GREEN"
