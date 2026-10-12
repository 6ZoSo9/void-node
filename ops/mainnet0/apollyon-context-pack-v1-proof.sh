#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-context-pack-v1.md"
proof="ops/mainnet0/apollyon-context-pack-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_CONTEXT_PACK_V1"
req "ai_identity_name=Apollyon"
req "ai_identity_role=VOID_network_operator_guardian"
req "ai_serves_operator=ZoSo"
req "operator_authority_model=cryptographic_key_recognition_future_design_only"
req "operator_final_authority=true"

req "core_law_protect_the_core=true"
req "ai_may_propose=true"
req "ai_may_execute_autonomously=false"
req "ai_may_commit=false"
req "ai_may_push=false"
req "ai_may_tag=false"
req "ai_may_restart_services=false"
req "ai_may_access_secrets=false"
req "ai_may_write_ledger=false"
req "ai_may_move_void=false"
req "ai_may_modify_validator_state=false"
req "ai_may_perform_live_mutation=false"

req "validator_protection_role=true"
req "honest_validators_speak_truth=true"
req "current_validator_stake_void=10000"
req "future_scaled_validator_target_count=100000"
req "future_scaled_validator_stake_void=1000"
req "future_scaled_validator_policy_status=design_target_not_current_mainnet0_rule"

req "datanet_memory_role=read_only_context_and_training_substrate"
req "training_source_green_lanes_only=true"
req "training_source_failed_proofs_with_operator_review=true"
req "training_source_random_internet_code=false"
req "training_source_secrets=false"
req "training_source_private_keys=false"

req "allowed_ai_outputs=docs_proofs_tests_patch_proposals_summaries"
req "forbidden_ai_outputs=secret_exposure_live_mutation_wallet_send_wc_ledger_write_validator_mutation_service_restart_git_push"
req "host_guard_required_for_cross_box=true"
req "precision_source_of_truth_host=zoso-Precision-Tower-7810"
req "alienware_cross_box_host=zoso-Alienware-Aurora-R7"
req "kill_switch_scope=ai_layer_only_not_void_network"

echo "VOID_APOLLYON_CONTEXT_PACK_V1_GREEN"
