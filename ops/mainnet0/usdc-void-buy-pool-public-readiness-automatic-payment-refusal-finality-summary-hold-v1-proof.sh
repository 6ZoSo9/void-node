#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-public-readiness-automatic-payment-refusal-finality-summary-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_AUTOMATIC_PAYMENT_REFUSAL_FINALITY_SUMMARY_HOLD_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
proof="ops/mainnet0/$name-proof.sh"

dependency_doc="docs/public/usdc-void-buy-pool-public-readiness-automatic-payment-refusal-completion-pointer-closeout-hold-v1.md"
dependency_fixture="fixtures/public/usdc-void-buy-pool-public-readiness-automatic-payment-refusal-completion-pointer-closeout-hold-v1.json"

echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_AUTOMATIC_PAYMENT_REFUSAL_FINALITY_SUMMARY_HOLD_V1_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$proof"
echo "public_readiness_automatic_payment_refusal_finality_summary_hold_files_exist=true"

test -f "$dependency_doc"
test -f "$dependency_fixture"
echo "public_readiness_automatic_payment_refusal_finality_summary_hold_dependency_exists=true"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"
grep -Fq "$marker" "$proof"
echo "public_readiness_automatic_payment_refusal_finality_summary_hold_marker_green=true"

case "$(git status --short -- "$doc" "$fixture" "$proof")" in
  *$\t*'D'**) echo "files_deleted=false"; exit 1 ;;
esac

cut_private_leak_file="/tmp/void-public-safe-summary-closeout-private-leak.txt"
if git grep -Ei "private/operator|docs/private|fixtures/private" -- "$doc" "$fixture" >"$cut_private_leak_file" 2>/dev/null; then
  cat "$cut_private_leak_file"
  echo "public_readiness_automatic_payment_refusal_finality_summary_hold_private_leak_absent=false"
  exit 1
else
  echo "public_readiness_automatic_payment_refusal_finality_summary_hold_private_leak_absent=true"
fi

if git grep -F "$marker" -- src >/tmp/void-public-safe-summary-closeout-runtime-route.txt 2>/dev/null; then
  cat /tmp/void-public-safe-summary-closeout-runtime-route.txt
  echo "public_readiness_automatic_payment_refusal_finality_summary_hold_no_runtime_route=false"
  exit 1
else
  echo "public_readiness_automatic_payment_refusal_finality_summary_hold_no_runtime_route=true"
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
assert data["schema"] == "usdc_void_buy_pool_public_readiness_automatic_payment_refusal_finality_summary_hold_v1"
assert data["visibility"] == "public_safe_buy_pool_public_readiness_automatic_payment_refusal_finality_summary"
assert data["status"] == "public_readiness_automatic_payment_refusal_finality_summary_hold"

closed = data["closed_public_safe_chain"]
assert len(closed) == 39
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
assert data["public_finality_summary_closeout_ready"] is True
assert data["public_completion_pointer_ready"] is True
assert data["public_safety_index_inclusion_ready"] is True
assert data["public_safety_index_inclusion_closeout_ready"] is True
assert data["public_safety_index_inclusion_completion_pointer_ready"] is True
assert data["public_safety_index_automatic_payment_refusal_rollup_ready"] is True
assert data["public_safety_index_automatic_payment_refusal_rollup_closeout_ready"] is True
assert data["public_safety_index_automatic_payment_refusal_rollup_completion_pointer_ready"] is True
assert data["public_safety_rollup_inclusion_ready"] is True
assert data["public_safety_rollup_inclusion_closeout_ready"] is True
assert data["public_safety_rollup_inclusion_completion_pointer_ready"] is True
assert data["public_readiness_rollup_safety_bridge_ready"] is True
assert data["public_readiness_rollup_safety_bridge_closeout_ready"] is True
assert data["public_readiness_rollup_safety_bridge_completion_pointer_ready"] is True
assert data["public_readiness_rollup_automatic_payment_refusal_inclusion_ready"] is True
assert data["public_readiness_rollup_automatic_payment_refusal_inclusion_closeout_ready"] is True
assert data["public_readiness_rollup_automatic_payment_refusal_inclusion_completion_pointer_ready"] is True
assert data["public_readiness_rollup_automatic_payment_refusal_terminal_rollup_ready"] is True
assert data["public_readiness_rollup_automatic_payment_refusal_terminal_rollup_closeout_ready"] is True
assert data["public_readiness_rollup_automatic_payment_refusal_terminal_rollup_completion_pointer_ready"] is True
assert data["public_readiness_automatic_payment_refusal_completion_pointer_ready"] is True
assert data["public_readiness_automatic_payment_refusal_completion_pointer_closeout_ready"] is True
assert data["public_readiness_automatic_payment_refusal_finality_summary_ready"] is True
assert "usdc-void-buy-pool-public-readiness-automatic-payment-refusal-completion-pointer-closeout-hold-v1" in closed
finality = data["public_readiness_automatic_payment_refusal_finality_summary"]
assert finality["finality_summary_ready"] is True
assert finality["completion_pointer_closeout_ready"] is True
assert finality["public_readiness_automatic_payment_refusal_public_safe_chain_complete"] is True
assert finality["public_readiness_rollup_complete"] is True
assert finality["terminal_rollup_complete"] is True
assert finality["terminal_rollup_public_safe_chain_complete"] is True
assert finality["readiness_inclusion_complete"] is True
assert finality["readiness_inclusion_public_safe_chain_complete"] is True
assert finality["safety_bridge_complete"] is True
assert finality["bridge_public_safe_chain_complete"] is True
assert finality["public_safety_rollup_inclusion_complete"] is True
assert finality["automatic_payment_refusal_rollup_complete"] is True
assert finality["automatic_payment_activation_refused"] is True
assert finality["automatic_payment_activation_authorized"] is False
assert finality["runtime_route_exposed"] is False
assert finality["public_mutation_authorized"] is False
assert finality["buyer_action_executed"] is False
assert finality["operator_payment_execution_authorized"] is False
assert finality["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-readiness-automatic-payment-refusal-completion-pointer-hold-v1" in closed
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-terminal-rollup-completion-pointer-hold-v1" in closed
readiness_pointer = data["public_readiness_automatic_payment_refusal_completion_pointer"]
assert readiness_pointer["completion_pointer_ready"] is True
assert readiness_pointer["public_readiness_rollup_complete"] is True
assert readiness_pointer["terminal_rollup_complete"] is True
assert readiness_pointer["terminal_rollup_public_safe_chain_complete"] is True
assert readiness_pointer["readiness_inclusion_complete"] is True
assert readiness_pointer["readiness_inclusion_public_safe_chain_complete"] is True
assert readiness_pointer["safety_bridge_complete"] is True
assert readiness_pointer["bridge_public_safe_chain_complete"] is True
assert readiness_pointer["public_safety_rollup_inclusion_complete"] is True
assert readiness_pointer["automatic_payment_refusal_rollup_complete"] is True
assert readiness_pointer["automatic_payment_activation_refused"] is True
assert readiness_pointer["automatic_payment_activation_authorized"] is False
assert readiness_pointer["runtime_route_exposed"] is False
assert readiness_pointer["public_mutation_authorized"] is False
assert readiness_pointer["buyer_action_executed"] is False
assert readiness_pointer["operator_payment_execution_authorized"] is False
assert readiness_pointer["wallet_or_treasury_authority_granted"] is False
assert readiness_pointer["completion_pointer_closeout_ready"] is True
assert readiness_pointer["public_readiness_automatic_payment_refusal_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-terminal-rollup-closeout-hold-v1" in closed
pointer = data["public_readiness_rollup_automatic_payment_refusal_terminal_rollup_completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["terminal_rollup_ready"] is True
assert pointer["terminal_rollup_closeout_ready"] is True
assert pointer["terminal_rollup_public_safe_chain_complete"] is True
assert pointer["readiness_inclusion_complete"] is True
assert pointer["readiness_inclusion_public_safe_chain_complete"] is True
assert pointer["safety_bridge_complete"] is True
assert pointer["bridge_public_safe_chain_complete"] is True
assert pointer["public_safety_rollup_inclusion_complete"] is True
assert pointer["automatic_payment_refusal_rollup_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-terminal-rollup-hold-v1" in closed
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-inclusion-completion-pointer-hold-v1" in closed
terminal = data["public_readiness_rollup_automatic_payment_refusal_terminal_rollup"]
assert terminal["terminal_rollup_ready"] is True
assert terminal["readiness_inclusion_complete"] is True
assert terminal["readiness_inclusion_public_safe_chain_complete"] is True
assert terminal["safety_bridge_complete"] is True
assert terminal["bridge_public_safe_chain_complete"] is True
assert terminal["public_safety_rollup_inclusion_complete"] is True
assert terminal["automatic_payment_refusal_rollup_complete"] is True
assert terminal["automatic_payment_activation_refused"] is True
assert terminal["automatic_payment_activation_authorized"] is False
assert terminal["runtime_route_exposed"] is False
assert terminal["public_mutation_authorized"] is False
assert terminal["buyer_action_executed"] is False
assert terminal["operator_payment_execution_authorized"] is False
assert terminal["wallet_or_treasury_authority_granted"] is False
assert terminal["terminal_rollup_closeout_ready"] is True
assert terminal["terminal_rollup_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-inclusion-closeout-hold-v1" in closed
pointer = data["public_readiness_rollup_automatic_payment_refusal_inclusion_completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["inclusion_ready"] is True
assert pointer["inclusion_closeout_ready"] is True
assert pointer["inclusion_public_safe_chain_complete"] is True
assert pointer["safety_bridge_complete"] is True
assert pointer["bridge_public_safe_chain_complete"] is True
assert pointer["public_safety_rollup_inclusion_complete"] is True
assert pointer["automatic_payment_refusal_rollup_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-inclusion-hold-v1" in closed
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-safety-bridge-completion-pointer-hold-v1" in closed
readiness_inclusion = data["public_readiness_rollup_automatic_payment_refusal_inclusion"]
assert readiness_inclusion["inclusion_ready"] is True
assert readiness_inclusion["safety_bridge_complete"] is True
assert readiness_inclusion["bridge_public_safe_chain_complete"] is True
assert readiness_inclusion["public_safety_rollup_inclusion_complete"] is True
assert readiness_inclusion["automatic_payment_refusal_rollup_complete"] is True
assert readiness_inclusion["automatic_payment_activation_refused"] is True
assert readiness_inclusion["automatic_payment_activation_authorized"] is False
assert readiness_inclusion["runtime_route_exposed"] is False
assert readiness_inclusion["public_mutation_authorized"] is False
assert readiness_inclusion["buyer_action_executed"] is False
assert readiness_inclusion["operator_payment_execution_authorized"] is False
assert readiness_inclusion["wallet_or_treasury_authority_granted"] is False
assert readiness_inclusion["inclusion_closeout_ready"] is True
assert readiness_inclusion["inclusion_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-safety-bridge-closeout-hold-v1" in closed
pointer = data["public_readiness_rollup_safety_bridge_completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["bridge_ready"] is True
assert pointer["bridge_closeout_ready"] is True
assert pointer["bridge_public_safe_chain_complete"] is True
assert pointer["public_safety_rollup_inclusion_complete"] is True
assert pointer["automatic_payment_refusal_rollup_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-readiness-rollup-automatic-payment-refusal-safety-bridge-hold-v1" in closed
assert "usdc-void-buy-pool-public-safety-rollup-automatic-payment-refusal-inclusion-completion-pointer-hold-v1" in closed
bridge = data["public_readiness_rollup_safety_bridge"]
assert bridge["bridge_ready"] is True
assert bridge["public_safety_rollup_inclusion_complete"] is True
assert bridge["automatic_payment_refusal_rollup_complete"] is True
assert bridge["automatic_payment_activation_refused"] is True
assert bridge["automatic_payment_activation_authorized"] is False
assert bridge["runtime_route_exposed"] is False
assert bridge["public_mutation_authorized"] is False
assert bridge["buyer_action_executed"] is False
assert bridge["operator_payment_execution_authorized"] is False
assert bridge["wallet_or_treasury_authority_granted"] is False
assert bridge["bridge_closeout_ready"] is True
assert bridge["bridge_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-public-safety-rollup-automatic-payment-refusal-inclusion-closeout-hold-v1" in closed
pointer = data["public_safety_rollup_inclusion_completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["inclusion_ready"] is True
assert pointer["inclusion_closeout_ready"] is True
assert pointer["inclusion_public_safe_chain_complete"] is True
assert pointer["automatic_payment_refusal_rollup_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-safety-rollup-automatic-payment-refusal-inclusion-hold-v1" in closed
assert "usdc-void-buy-pool-public-safety-index-automatic-payment-refusal-rollup-completion-pointer-hold-v1" in closed
rollup_inclusion = data["public_safety_rollup_inclusion"]
assert rollup_inclusion["inclusion_ready"] is True
assert rollup_inclusion["automatic_payment_refusal_rollup_complete"] is True
assert rollup_inclusion["automatic_payment_activation_refused"] is True
assert rollup_inclusion["automatic_payment_activation_authorized"] is False
assert rollup_inclusion["runtime_route_exposed"] is False
assert rollup_inclusion["public_mutation_authorized"] is False
assert rollup_inclusion["buyer_action_executed"] is False
assert rollup_inclusion["operator_payment_execution_authorized"] is False
assert rollup_inclusion["wallet_or_treasury_authority_granted"] is False
assert rollup_inclusion["inclusion_closeout_ready"] is True
assert rollup_inclusion["inclusion_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-public-safety-index-automatic-payment-refusal-rollup-closeout-hold-v1" in closed
pointer = data["automatic_payment_refusal_rollup_completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["rollup_ready"] is True
assert pointer["rollup_closeout_ready"] is True
assert pointer["rollup_public_safe_chain_complete"] is True
assert pointer["included_lane_sealed"] is True
assert pointer["included_lane_archived"] is True
assert pointer["included_lane_finality_summarized"] is True
assert pointer["included_lane_public_safe_chain_complete"] is True
assert pointer["inclusion_closeout_ready"] is True
assert pointer["inclusion_completion_pointer_ready"] is True
assert pointer["inclusion_public_safe_chain_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-safety-index-automatic-payment-refusal-rollup-hold-v1" in closed
assert "usdc-void-buy-pool-public-safety-index-automatic-payment-refusal-inclusion-completion-pointer-hold-v1" in closed
rollup = data["automatic_payment_refusal_rollup"]
assert rollup["rollup_ready"] is True
assert rollup["included_lane_sealed"] is True
assert rollup["included_lane_archived"] is True
assert rollup["included_lane_finality_summarized"] is True
assert rollup["included_lane_public_safe_chain_complete"] is True
assert rollup["inclusion_closeout_ready"] is True
assert rollup["inclusion_completion_pointer_ready"] is True
assert rollup["inclusion_public_safe_chain_complete"] is True
assert rollup["automatic_payment_activation_refused"] is True
assert rollup["automatic_payment_activation_authorized"] is False
assert rollup["runtime_route_exposed"] is False
assert rollup["public_mutation_authorized"] is False
assert rollup["buyer_action_executed"] is False
assert rollup["operator_payment_execution_authorized"] is False
assert rollup["wallet_or_treasury_authority_granted"] is False
assert rollup["rollup_closeout_ready"] is True
assert rollup["rollup_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-public-safety-index-automatic-payment-refusal-inclusion-closeout-hold-v1" in closed
pointer = data["safety_index_inclusion_completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["included_lane_sealed"] is True
assert pointer["included_lane_archived"] is True
assert pointer["included_lane_finality_summarized"] is True
assert pointer["included_lane_public_safe_chain_complete"] is True
assert pointer["inclusion_closeout_ready"] is True
assert pointer["inclusion_public_safe_chain_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-public-safety-index-automatic-payment-refusal-inclusion-hold-v1" in closed
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-completion-pointer-hold-v1" in closed
inclusion = data["safety_index_inclusion"]
assert inclusion["inclusion_ready"] is True
assert inclusion["included_lane_sealed"] is True
assert inclusion["included_lane_archived"] is True
assert inclusion["included_lane_finality_summarized"] is True
assert inclusion["included_lane_public_safe_chain_complete"] is True
assert inclusion["automatic_payment_activation_refused"] is True
assert inclusion["automatic_payment_activation_authorized"] is False
assert inclusion["runtime_route_exposed"] is False
assert inclusion["public_mutation_authorized"] is False
assert inclusion["buyer_action_executed"] is False
assert inclusion["operator_payment_execution_authorized"] is False
assert inclusion["wallet_or_treasury_authority_granted"] is False
assert inclusion["inclusion_closeout_ready"] is True
assert inclusion["inclusion_public_safe_chain_complete"] is True
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-finality-summary-closeout-hold-v1" in closed
pointer = data["completion_pointer"]
assert pointer["completion_pointer_ready"] is True
assert pointer["sealed"] is True
assert pointer["archived"] is True
assert pointer["finality_summarized"] is True
assert pointer["public_safe_chain_complete"] is True
assert pointer["automatic_payment_activation_refused"] is True
assert pointer["automatic_payment_activation_authorized"] is False
assert pointer["runtime_route_exposed"] is False
assert pointer["public_mutation_authorized"] is False
assert pointer["buyer_action_executed"] is False
assert pointer["operator_payment_execution_authorized"] is False
assert pointer["wallet_or_treasury_authority_granted"] is False
assert "usdc-void-buy-pool-automatic-payment-activation-refusal-public-finality-summary-hold-v1" in closed
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
assert summary["finality_summary_closeout_ready"] is True
assert summary["finality_summary_public_safe_chain_complete"] is True
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

print("public_readiness_automatic_payment_refusal_finality_summary_hold_json_semantics_green=true")
PY

echo "public_readiness_automatic_payment_refusal_finality_summary_hold_authority_false_green=true"
echo "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_AUTOMATIC_PAYMENT_REFUSAL_FINALITY_SUMMARY_HOLD_V1_GREEN"
