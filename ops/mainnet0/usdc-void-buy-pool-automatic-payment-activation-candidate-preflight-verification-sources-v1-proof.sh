#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-verification-sources-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_VERIFICATION_SOURCES_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
echo "activation_candidate_preflight_verification_sources_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "activation_candidate_preflight_verification_sources_marker_green=true"

python3 - <<'PY2'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-verification-sources-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_VERIFICATION_SOURCES_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_verification_sources_ready"
assert j["scope"] == "private_operator_only_source_binding_not_execution"
assert j["precision_source_of_truth"] is True
assert j["next_required_gate"] == "activation_candidate_preflight_source_consistency_check_v1"
assert len(j["source_chain"]) == 12
assert len(j["verification_sources_bound"]) == 12

for label, path in j["source_chain"].items():
    assert Path(path).exists(), f"missing source {label}: {path}"

b = j["boundary"]
assert b["verification_source_binding"] is True
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

print("activation_candidate_preflight_verification_sources_fixture_green=true")
print("activation_candidate_preflight_verification_sources_source_chain_green=true")
print("activation_candidate_preflight_verification_sources_boundary_green=true")
PY2

grep -RInF 'git status --short' "$doc" "$fixture" && exit 1 || true
grep -RInF 'zoso@' "$doc" "$fixture" && exit 1 || true
echo "activation_candidate_preflight_verification_sources_contamination_absent=true"

echo "activation_candidate_preflight_verification_sources_no_signer_access=true"
echo "activation_candidate_preflight_verification_sources_no_transfer=true"
echo "activation_candidate_preflight_verification_sources_no_broadcast=true"
echo "activation_candidate_preflight_verification_sources_no_fulfilled_state=true"
echo "${marker}_GREEN"
