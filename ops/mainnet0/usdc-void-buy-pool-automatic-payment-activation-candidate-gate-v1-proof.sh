#!/usr/bin/env bash
set -euo pipefail

n="usdc-void-buy-pool-automatic-payment-activation-candidate-gate-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_GATE_V1"

doc="docs/private/$n.md"
fixture="fixtures/private/$n.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
echo "automatic_payment_activation_candidate_gate_files_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
echo "automatic_payment_activation_candidate_gate_marker_green=true"

python3 - <<'PY'
import json
from pathlib import Path

n = "usdc-void-buy-pool-automatic-payment-activation-candidate-gate-v1"
marker = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_GATE_V1"

fixture = json.loads(Path(f"fixtures/private/{n}.json").read_text())

assert fixture["marker"] == marker
assert fixture["id"] == n
assert fixture["status"] == "activation_candidate_gate_ready"
assert fixture["precision_source_of_truth"] is True
assert fixture["alienware_cross_box_required"] is False
assert fixture["next_required_gate"] == "activation_candidate_preflight_execution_plan_v1"

for label, path in fixture["source_chain"].items():
    assert Path(path).exists(), f"missing source {label}: {path}"

boundary = fixture["boundary"]
assert boundary["private_operator_only"] is True
assert boundary["activation_intent_recorded"] is True
assert boundary["activation_scope"] == "candidate_gate_only"
assert boundary["verified_payment_decisioning_candidate"] is True

for key in [
    "public_mutation_route_created",
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
]:
    assert boundary[key] is False, key

print("automatic_payment_activation_candidate_gate_fixture_green=true")
print("automatic_payment_activation_candidate_gate_source_chain_green=true")
print("automatic_payment_activation_candidate_gate_boundary_green=true")
PY

if grep -RInE '```|zoso@|Enumerating objects|Counting objects|Delta compression|Writing objects|remote:|git push|npm run build|Tailscale SSH|Authentication checked' "$doc" "$fixture" >/tmp/${n}-terminal-contamination.txt; then
  cat /tmp/${n}-terminal-contamination.txt
  exit 1
fi
echo "automatic_payment_activation_candidate_gate_terminal_output_contamination_absent=true"

if grep -RInE 'private_key|seed_phrase|wallet_secret|secret[[:space:]]*=' "$doc" "$fixture" >/tmp/${n}-secret-leak.txt; then
  cat /tmp/${n}-secret-leak.txt
  exit 1
fi
echo "automatic_payment_activation_candidate_gate_secret_material_absent=true"

if grep -RInE 'automatic_fulfillment_enabled[":[:space:]]+true|wallet_fulfillment_enabled[":[:space:]]+true|signer_access_granted[":[:space:]]+true|terminal_execute_authorized[":[:space:]]+true|actual_execute_authorized[":[:space:]]+true|execution_performed[":[:space:]]+true|signing_performed[":[:space:]]+true|void_transfer_performed[":[:space:]]+true|transaction_broadcast[":[:space:]]+true|fulfilled_state_written[":[:space:]]+true|public_mutation_route_created[":[:space:]]+true' "$doc" "$fixture" >/tmp/${n}-authority-true.txt; then
  cat /tmp/${n}-authority-true.txt
  exit 1
fi
echo "automatic_payment_activation_candidate_gate_authority_boundary_green=true"

if grep -RInE '"(automatic_fulfillment|wallet_fulfillment|signer_access|terminal_execute_authorized|actual_execute_authorized|transaction_broadcast)"[[:space:]]*:[[:space:]]*true' \
  public/public-node/usdc-void-buy-pool \
  fixtures/public \
  >/tmp/${n}-public-authority-true.txt; then
  cat /tmp/${n}-public-authority-true.txt
  exit 1
fi
echo "automatic_payment_activation_candidate_gate_public_authority_true_absent=true"

echo "automatic_payment_activation_candidate_gate_no_signer_access=true"
echo "automatic_payment_activation_candidate_gate_no_transfer=true"
echo "automatic_payment_activation_candidate_gate_no_broadcast=true"
echo "automatic_payment_activation_candidate_gate_no_fulfilled_state=true"
echo "${marker}_GREEN"
