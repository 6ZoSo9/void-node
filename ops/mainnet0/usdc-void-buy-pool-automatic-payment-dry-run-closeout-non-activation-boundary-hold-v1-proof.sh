#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-dry-run-closeout-non-activation-boundary-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DRY_RUN_CLOSEOUT_NON_ACTIVATION_BOUNDARY_HOLD_V1"
closeout_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_DRY_RUN_CLOSEOUT_HOLD_V1"

doc="docs/private/$name.md"
fixture="fixtures/private/$name.json"
proof="ops/mainnet0/$name-proof.sh"

closeout_doc="docs/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-closeout-hold-v1.md"
closeout_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-operator-dry-run-closeout-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DRY_RUN_CLOSEOUT_NON_ACTIVATION_BOUNDARY_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_files_exist=true"

test -f "$closeout_doc"
test -f "$closeout_fixture"
echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_dependency_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_marker_green=true"

grep -Fq "$closeout_marker" "$doc"
grep -Fq "$closeout_marker" "$fixture"
grep -Fq "$closeout_marker" "$closeout_doc"
grep -Fq "$closeout_marker" "$closeout_fixture"
echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_dependency_marker_green=true"

if git grep -F "$marker" -- docs/public fixtures/public src >/tmp/void-dry-run-non-activation-public-leak.txt 2>/dev/null; then
  cat /tmp/void-dry-run-non-activation-public-leak.txt
  echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_no_public_or_src_leak=false"
  exit 1
else
  echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_no_public_or_src_leak=true"
fi

export fixture marker closeout_marker
python3 <<'PY'
import json
import os

fixture = os.environ["fixture"]
marker = os.environ["marker"]
closeout_marker = os.environ["closeout_marker"]

with open(fixture, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_dry_run_closeout_non_activation_boundary_hold_v1"
assert data["visibility"] == "private_operator_only"
assert data["status"] == "dry_run_closeout_not_activation"
assert data["sealed_dependency"]["marker"] == closeout_marker
assert data["sealed_dependency"]["head"] == "4f1bbad0"

for key, value in data["non_activation_claims"].items():
    assert value is False, key

requirements = data["future_activation_requirements"]
assert requirements["separate_explicit_operator_activation_artifact_required"] is True
assert requirements["separate_activation_proof_stack_required"] is True
assert requirements["two_box_verification_required"] is True
assert requirements["final_precision_sync_required"] is True
assert requirements["current_artifact_satisfies_activation"] is False

for section in ["authority", "public_surface"]:
    for key, value in data[section].items():
        assert value is False, f"{section}.{key}"

print("automatic_payment_dry_run_closeout_non_activation_boundary_hold_json_semantics_green=true")
PY

echo "automatic_payment_dry_run_closeout_non_activation_boundary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DRY_RUN_CLOSEOUT_NON_ACTIVATION_BOUNDARY_HOLD_V1_GREEN"
