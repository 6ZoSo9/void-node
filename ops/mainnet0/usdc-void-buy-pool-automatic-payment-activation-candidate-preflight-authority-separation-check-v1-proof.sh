#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-authority-separation-check-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_AUTHORITY_SEPARATION_CHECK_V1"
doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "authority_separation_files_and_marker_green=true"

python3 - <<'PY2'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-preflight-authority-separation-check-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_PREFLIGHT_AUTHORITY_SEPARATION_CHECK_V1"
j = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert j["marker"] == marker
assert j["id"] == n
assert j["status"] == "activation_candidate_preflight_authority_separation_check_ready"
assert j["scope"] == "private_operator_only_authority_separation_check_not_execution"
assert j["source_consistency_status"] == "activation_candidate_preflight_source_consistency_check_ready"
assert j["next_required_gate"] == "activation_candidate_preflight_terminal_authority_gate_hold_v1"
assert len(j["separation_checks"]) == 7

assert Path(j["signer_authorization_source"]).exists()
assert Path(j["execution_authorization_source"]).exists()
assert j["signer_authorization_source"] != j["execution_authorization_source"]

b = j["boundary"]
assert b["authority_separation_check"] is True
assert b["source_consistency_check_complete"] is True
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

print("authority_separation_fixture_green=true")
print("authority_separation_sources_separate_green=true")
print("authority_separation_boundary_green=true")
PY2

grep -RInF 'git status --short' "$doc" "$fixture" && exit 1 || true
grep -RInF 'zoso@' "$doc" "$fixture" && exit 1 || true
echo "authority_separation_contamination_absent=true"

echo "authority_separation_no_signer_access=true"
echo "authority_separation_no_terminal_execute=true"
echo "authority_separation_no_actual_execute=true"
echo "authority_separation_no_transfer=true"
echo "authority_separation_no_broadcast=true"
echo "authority_separation_no_fulfilled_state=true"
echo "${marker}_GREEN"
