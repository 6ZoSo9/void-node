#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-activation-refusal-public-finality-summary-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_FINALITY_SUMMARY_HOLD_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
proof="ops/mainnet0/$name-proof.sh"

dependency_doc="docs/public/usdc-void-buy-pool-automatic-payment-activation-refusal-public-archive-index-closeout-hold-v1.md"
dependency_fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-activation-refusal-public-archive-index-closeout-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_FINALITY_SUMMARY_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "automatic_payment_activation_refusal_public_finality_summary_hold_files_exist=true"

test -f "$dependency_doc"
test -f "$dependency_fixture"
echo "automatic_payment_activation_refusal_public_finality_summary_hold_dependency_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "automatic_payment_activation_refusal_public_finality_summary_hold_marker_green=true"

case "$(git status --short -- "$doc" "$fixture" "$proof")" in
  *$\t*'D'**) echo "files_deleted=false"; exit 1 ;;
esac

cut_private_leak_file="/tmp/void-public-safe-summary-closeout-private-leak.txt"
if git grep -Ei "private/operator|docs/private|fixtures/private" -- "$doc" "$fixture" >"$cut_private_leak_file" 2>/dev/null; then
  cat "$cut_private_leak_file"
  echo "automatic_payment_activation_refusal_public_finality_summary_hold_private_leak_absent=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_finality_summary_hold_private_leak_absent=true"
fi

if git grep -F "$marker" -- src >/tmp/void-public-safe-summary-closeout-runtime-route.txt 2>/dev/null; then
  cat /tmp/void-public-safe-summary-closeout-runtime-route.txt
  echo "automatic_payment_activation_refusal_public_finality_summary_hold_no_runtime_route=false"
  exit 1
else
  echo "automatic_payment_activation_refusal_public_finality_summary_hold_no_runtime_route=true"
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
assert data["schema"] == "usdc_void_buy_pool_automatic_payment_activation_refusal_public_finality_summary_hold_v1"
assert data["visibility"] == "public_safe_finality_summary"
assert data["status"] == "activation_refusal_public_finality_summary_hold"

closed = data["closed_public_safe_chain"]
assert len(closed) == 16
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-disclosure-boundary-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-safe-status-summary-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-safe-status-summary-closeout-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-evidence-index-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-evidence-index-closeout-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-reviewer-verify-pack-hold-v1" in closed

assert data["reviewer_handoff_ready"] is True
assert data["reviewer_verify_pack_ready"] is True
assert data["reviewer_verify_pack_closeout_ready"] is True
assert data["reviewer_terminal_rollup_ready"] is True
assert data["reviewer_terminal_rollup_closeout_ready"] is True
assert data["public_final_seal_ready"] is True
assert data["public_final_seal_closeout_ready"] is True
assert data["public_archive_index_ready"] is True
assert data["public_archive_index_closeout_ready"] is True
assert data["public_finality_summary_ready"] is True
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-archive-index-closeout-hold-v1" in closed
summary = data["finality_summary"]
assert summary["finality_summary_ready"] is True
assert summary["public_safe_chain_complete"] is True
assert summary["automatic_payment_activation_refused"] is True
assert summary["automatic_payment_activation_authorized"] is False
assert summary["runtime_route_exposed"] is False
assert summary["public_mutation_authorized"] is False
assert summary["buyer_action_executed"] is False
assert summary["operator_payment_execution_authorized"] is False
assert summary["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-archive-index-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-final-seal-closeout-hold-v1" in closed
archive = data["archive_index"]
assert archive["sealed"] is True
assert archive["runtime_route_exposed"] is False
assert archive["public_mutation_authorized"] is False
assert archive["automatic_payment_activation_authorized"] is False
assert archive["buyer_action_executed"] is False
assert archive["operator_payment_execution_authorized"] is False
assert archive["wallet_or_treasury_authority_granted"] is False
assert archive["archive_index_closeout_ready"] is True
assert archive["archive_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-final-seal-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-reviewer-terminal-rollup-closeout-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-reviewer-terminal-rollup-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-reviewer-verify-pack-closeout-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-reviewer-verify-pack-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-reviewer-verify-pack-hold-v1" in closed
conclusion = data["public_conclusion"]
assert conclusion["automatic_payment_activation_refused"] is True
assert conclusion["all_automatic_payment_authority_false"] is True
assert conclusion["buyer_action_executed"] is False

for key, value in data["authority"].items():
    assert value is False, key

print("automatic_payment_activation_refusal_public_finality_summary_hold_json_semantics_green=true")
PY

echo "automatic_payment_activation_refusal_public_finality_summary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_PUBLIC_FINALITY_SUMMARY_HOLD_V1_GREEN"
