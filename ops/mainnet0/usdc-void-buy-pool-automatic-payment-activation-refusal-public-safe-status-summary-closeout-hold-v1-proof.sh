#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-activation-refusal-public-safe-status-summary-closeout-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_SAFE_STATUS_SUMMARY_CLOSEOUT_HOLD_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
proof="ops/mainnet0/$name-proof.sh"

dependency_doc="docs/public/usdc-void-buy-pool-automatic-payment-activation-refusal-public-safe-status-summary-hold-v1.md"
dependency_fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-activation-refusal-public-safe-status-summary-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_SAFE_STATUS_SUMMARY_CLOSEOUT_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_files_exist=true"

test -f "$dependency_doc"
test -f "$dependency_fixture"
echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_dependency_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_marker_green=true"

case "$(git status --short -- "$doc" "$fixture" "$proof")" in
  *$\t*'D'**) echo "files_deleted=false"; exit 1 ;;
esac

cut_private_leak_file="/tmp/void-public-safe-summary-closeout-private-leak.txt"
if git grep -Ei "private/operator|docs/private|fixtures/private" -- "$doc" "$fixture" >"$cut_private_leak_file" 2>/dev/null; then
  cat "$cut_private_leak_file"
  echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_private_leak_absent=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_private_leak_absent=true"
fi

if git grep -F "$marker" -- src >/tmp/void-public-safe-summary-closeout-runtime-route.txt 2>/dev/null; then
  cat /tmp/void-public-safe-summary-closeout-runtime-route.txt
  echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_no_runtime_route=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_no_runtime_route=true"
fi

export fixture marker
python3 <<'PY'
import json
import os

fixture = os.environ["fixture"]
marker = os.environ["marker"]

with open(fixture, "r", encoding="utf-8") as f:
    data = json.load(f)

assert data["marker"] == marker
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_v1"
assert data["visibility"] == "public_safe_summary"
assert data["status"] == "activation_refusal_public_safe_status_summary_closeout_hold"

scope = data["closeout_scope"]
assert scope["public_safe_status_summary_closed"] is True
assert scope["status_only_evidence"] is True
for key in ["runtime_route_created", "public_mutation_created", "buyer_action_executed", "activation_satisfied"]:
    assert scope[key] is False, key

status = data["public_safe_status"]
for key, value in status.items():
    assert value is True, key

for section in ["non_disclosure", "authority"]:
    for key, value in data[section].items():
        assert value is False, f"{section}.{ key }"

print("automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_json_semantics_green=true")
PY

echo "automatic_payment_activation_refusal_public_safe_status_summary_closeout_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_SAFE_STATUS_SUMMARY_CLOSEOUT_HOLD_V1_GREEN"
