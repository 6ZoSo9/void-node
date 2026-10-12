#!/bin/bash
set -euo pipefail

# VOID Local AI Operator Harness v1 Proof
# Fail-closed, low-output verification script

# Check both files exist
if [[ ! -f "docs/public/public-node-local-ai-operator-harness-v1.md" ]]; then
    echo "ERROR: Missing docs/public/public-node-local-ai-operator-harness-v1.md"
    exit 1
fi

if [[ ! -f "ops/mainnet0/local-ai-operator-harness-v1-proof.sh" ]]; then
    echo "ERROR: Missing ops/mainnet0/local-ai-operator-harness-v1-proof.sh"
    exit 1
fi

# Verify all required fields are present and correct
grep -q "marker=VOID_LOCAL_AI_OPERATOR_HARNESS_V1" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_identity_name=Apollyon" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_identity_scope=internal_operator_guardian" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_serves_operator=ZoSo" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_operator_auth_model=cryptographic_key_recognition_future_design_only" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_protects_validators=true" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_defends_against_unauthorized_ai_agents=true" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_propose=true" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_edit_worktree_only_under_operator_review=true" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_commit=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_push=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_tag=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_restart_services=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_access_secrets=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_write_ledger=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_move_void=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_modify_validator_state=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_perform_live_mutation=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "operator_final_authority=true" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "kill_switch_scope=ai_layer_only_not_void_network" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "current_validator_stake_void=10000" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "future_scaled_validator_target_count=100000" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "future_scaled_validator_stake_void=1000" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "future_scaled_validator_policy_status=design_target_not_current_mainnet0_rule" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "honest_validators_speak_truth=true" docs/public/public-node-local-ai-operator-harness-v1.md

# Verify forbidden capabilities are false
grep -q "ai_can_commit=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_push=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_tag=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_restart_services=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_access_secrets=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_write_ledger=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_move_void=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_modify_validator_state=false" docs/public/public-node-local-ai-operator-harness-v1.md
grep -q "ai_can_perform_live_mutation=false" docs/public/public-node-local-ai-operator-harness-v1.md

# Emit success marker
echo "VOID_LOCAL_AI_OPERATOR_HARNESS_V1_GREEN"
