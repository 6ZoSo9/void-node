#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-operator-dry-run-closeout-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_CLOSEOUT_HOLD_V1"
packet_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_PACKET_HOLD_V1"
result_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_DECISION_RESULT_HOLD_V1"

doc="docs/private/$name.md"
fixture="fixtures/private/$name.json"
proof="ops/mainnet0/$name-proof.sh"

packet_doc="docs/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-packet-hold-v1.md"
packet_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-packet-hold-v1.json"
result_doc="docs/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-result-hold-v1.md"
result_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-decision-result-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_CLOSEOUT_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "automatic_payment_operator_dry_run_closeout_hold_files_exist=true"

test -f "$packet_doc"
test -f "$packet_fixture"
test -f "$result_doc"
test -f "$result_fixture"
echo "automatic_payment_operator_dry_run_closeout_hold_dependencies_exist=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_operator_dry_run_closeout_hold_marker_green=true"

grep -Fq "$packet_marker" "$doc"
grep -Fq "$packet_marker" "$fixture"
grep -Fq "$packet_marker" "$packet_doc"
grep -Fq "$packet_marker" "$packet_fixture"
grep -Fq "$result_marker" "$doc"
grep -Fq "$result_marker" "$fixture"
grep -Fq "$result_marker" "$result_doc"
grep -Fq "$result_marker" "$result_fixture"
echo "automatic_payment_operator_dry_run_closeout_hold_dependency_markers_green=true"

if git grep -F "$marker" -- docs/public fixtures/public src >/tmp/void-dry-run-closeout-public-leak.txt 2>/dev/null; then
  cat /tmp/void-dry-run-closeout-public-leak.txt
  echo "automatic_payment_operator_dry_run_closeout_hold_no_public_or_src_leak=false"
  exit 1
else
  echo "automatic_payment_operator_dry_run_closeout_hold_no_public_or_src_leak=true"
fi

export fixture marker packet_marker result_marker
python3 <<'PY'
import json
import os

fixture = os.environ["fixture"]
marker = os.environ["marker"]
packet_marker = os.environ["packet_marker"]
result_marker = os.environ["result_marker"]

with open(fixture, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_operator_dry_run_closeout_hold_v1"
assert data["visibility"] == "private_operator_only"
assert data["status"] == "operator_dry_run_closeout_hold"
assert data["sealed_head"] == "54c73595"

deps = data["sealed_dependencies"]
assert deps["decision_packet_hold"]["marker"] == packet_marker
assert deps["decision_result_hold"]["marker"] == result_marker
assert deps["decision_packet_hold"]["head"] == "75e1d11a"
assert deps["decision_result_hold"]["head"] == "54c73595"

scope = data["closeout_scope"]
assert scope["dry_run_chain_closed"] is True
assert scope["evidence_only"] is True
for key in [
    "activation_artifact",
    "real_payment_verification",
    "payment_approval",
    "allocation_creation",
    "inventory_reserve",
    "ledger_write",
    "fulfillment_execution",
    "void_transfer",
]:
    assert scope[key] is False, key

for section in ["public_surface", "authority"]:
    for key, value in data[section].items():
        assert value is False, f"{section}.{key}"

print("automatic_payment_operator_dry_run_closeout_hold_json_semantics_green=true")
PY

echo "automatic_payment_operator_dry_run_closeout_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_CLOSEOUT_HOLD_V1_GREEN"
