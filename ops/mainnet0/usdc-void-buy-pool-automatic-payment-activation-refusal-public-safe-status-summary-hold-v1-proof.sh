#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-activation-refusal-public-safe-status-summary-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_SAFE_STATUS_SUMMARY_HOLD_V1"
private_dependency_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_DISCLOSURE_BOUNDARY_HOLD_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
proof="ops/mainnet0/$name-proof.sh"

dependency_doc="docs/private/usdc-void-buy-pool-automatic-payment-activation-refusal-public-disclosure-boundary-hold-v1.md"
dependency_fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-activation-refusal-public-disclosure-boundary-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_SAFE_STATUS_SUMMARY_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_files_exist=true"

test -f "$dependency_doc"
test -f "$dependency_fixture"
grep -Fq "$private_dependency_marker" "$dependency_doc"
grep -Fq "$private_dependency_marker" "$dependency_fixture"
echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_private_dependency_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_marker_green=true"

if git grep -F "$private_dependency_marker" -- docs/public fixtures/public src >/tmp/void-public-safe-status-private-marker-leak.txt 2>/dev/null; then
  cat /tmp/void-public-safe-status-private-marker-leak.txt
  echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_private_marker_no_leak=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_private_marker_no_leak=true"
fi

if git grep -Ei 'private/operator|docs/private|fixtures/private' -- "$doc" "$fixture" >/tmp/void-public-safe-status-forbidden-terms.txt 2>/dev/null; then
  cat /tmp/void-public-safe-status-forbidden-terms.txt
  echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_forbidden_terms=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_forbidden_terms=false_terms_absent=true"
fi

if git grep -F "$marker" -- src >/tmp/void-public-safe-status-src-route.txt 2>/dev/null; then
  cat /tmp/void-public-safe-status-src-route.txt
  echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_no_runtime_route=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_no_runtime_route=true"
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
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_activation_refusal_public_safe_status_summary_hold_v1"
assert data["visibility"] == "public_safe_summary"
assert data["status"] == "automatic_payment_activation_refused"

summary = data["summary"]
assert summary["automatic_payment_activation_refused"] is True
assert summary["all_authority_false"] is True
assert summary["status_only_evidence"] is True
assert summary["buyer_action_executed"] is False
assert summary["runtime_route_created"] is False
assert summary["public_mutation_created"] is False

for section in ["non_disclosure", "authority"]:
    for key, value in data[section].items():
        assert value is False, f"{section}.{key}"

print("automatic_payment_activation_refusal_public_safe_status_summary_hold_json_semantics_green=true")
PY

echo "automatic_payment_activation_refusal_public_safe_status_summary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_SAFE_STATUS_SUMMARY_HOLD_V1_GREEN"
