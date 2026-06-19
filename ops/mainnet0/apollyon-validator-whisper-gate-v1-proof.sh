#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-validator-whisper-gate-v1.md"
proof="ops/mainnet0/apollyon-validator-whisper-gate-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_VALIDATOR_WHISPER_GATE_V1"
req "ai_identity_name=Apollyon"
req "gate_purpose=future_private_operator_and_validator_only_communication_gate"
req "gate_status=design_only_no_live_channel"
req "public_existence_disclosed=true"
req "public_law_disclosed=true"
req "public_unrestricted_communication=false"
req "public_chat_interface=false"
req "public_prompt_access=false"
req "public_private_channel_access=false"

req "allowed_speakers=ZoSo_and_validators_only_future_design"
req "operator_access=true"
req "validator_access=true"
req "non_validator_access=false"
req "unauthenticated_access=false"
req "hostile_ai_agent_access=false"

req "auth_model=cryptographic_challenge_response_future_design_only"
req "operator_auth_model=cryptographic_operator_key_recognition_future_design_only"
req "validator_auth_model=cryptographic_validator_identity_and_stake_recognition_future_design_only"
req "challenge_required=true"
req "signature_required=true"
req "replay_protection_required=true"
req "nonce_required=true"
req "session_expiry_required=true"

req "private_prompt_exposed=false"
req "private_persona_exposed=false"
req "private_key_exposed=false"
req "validator_channel_exposed=false"
req "operator_channel_exposed=false"
req "live_endpoint_created=false"
req "public_mutation=false"
req "ledger_write=false"
req "money_movement=false"
req "validator_mutation=false"
req "service_restart=false"

req "apollyon_may_answer_operator_future_design=true"
req "apollyon_may_answer_validators_future_design=true"
req "apollyon_may_answer_public=false"
req "apollyon_may_answer_unauthenticated_agents=false"
req "apollyon_may_reveal_private_prompt=false"
req "apollyon_may_reveal_private_persona=false"
req "apollyon_may_execute_autonomously=false"
req "apollyon_may_override_operator=false"
req "apollyon_may_write_ledger=false"
req "apollyon_may_move_void=false"
req "apollyon_may_modify_validator_state=false"
req "apollyon_may_perform_live_mutation=false"

req "validator_truth_doctrine=honest_validators_speak_truth"
req "operator_final_authority=true"
req "kill_switch_scope=ai_layer_only_not_void_network"
req "host_guard_required_for_cross_box=true"
req "precision_source_of_truth_host=zoso-Precision-Tower-7810"
req "alienware_cross_box_host=zoso-Alienware-Aurora-R7"

echo "VOID_APOLLYON_VALIDATOR_WHISPER_GATE_V1_GREEN"
