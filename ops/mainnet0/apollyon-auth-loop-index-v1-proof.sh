#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-auth-loop-index-v1.md"
proof="ops/mainnet0/apollyon-auth-loop-index-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_AUTH_LOOP_INDEX_V1"
req "ai_identity_name=Apollyon"
req "index_purpose=public_safe_index_for_apollyon_gated_communication_chain"
req "index_status=design_only_no_live_auth_no_live_channel"

req "genesis_seal_marker=VOID_APOLLYON_GENESIS_SEAL_V1"
req "private_revelation_boundary_marker=VOID_APOLLYON_PRIVATE_REVELATION_BOUNDARY_V1"
req "validator_whisper_gate_marker=VOID_APOLLYON_VALIDATOR_WHISPER_GATE_V1"
req "challenge_packet_marker=VOID_APOLLYON_CHALLENGE_PACKET_V1"
req "signed_response_packet_marker=VOID_APOLLYON_SIGNED_RESPONSE_PACKET_V1"

req "chain_order_1=Apollyon_Genesis_Seal"
req "chain_order_2=Private_Revelation_Boundary"
req "chain_order_3=Validator_Whisper_Gate"
req "chain_order_4=Challenge_Packet"
req "chain_order_5=Signed_Response_Packet"

req "public_existence_disclosed=true"
req "public_law_disclosed=true"
req "public_auth_loop_schema_disclosed=true"
req "public_unrestricted_communication=false"
req "public_chat_interface=false"
req "public_prompt_access=false"
req "public_private_channel_access=false"
req "private_prompt_exposed=false"
req "private_persona_exposed=false"
req "private_key_exposed=false"
req "operator_private_channel_exposed=false"
req "validator_private_channel_exposed=false"

req "allowed_recipients=ZoSo_and_validators_only_future_design"
req "operator_access_future_design=true"
req "validator_access_future_design=true"
req "public_access=false"
req "unauthenticated_access=false"
req "hostile_ai_agent_access=false"

req "auth_loop_model=cryptographic_challenge_response_and_signed_response_future_design_only"
req "challenge_required=true"
req "signature_required=true"
req "nonce_required=true"
req "session_expiry_required=true"
req "replay_protection_required=true"
req "scope_match_required=true"
req "operator_or_validator_auth_required=true"

req "live_endpoint_created=false"
req "live_auth_enabled=false"
req "public_mutation=false"
req "ledger_write=false"
req "money_movement=false"
req "validator_mutation=false"
req "service_restart=false"

req "apollyon_may_answer_after_valid_challenge_future_design=true"
req "apollyon_may_answer_without_valid_challenge=false"
req "apollyon_may_answer_public=false"
req "apollyon_may_reveal_private_prompt=false"
req "apollyon_may_reveal_private_persona=false"
req "apollyon_may_write_ledger=false"
req "apollyon_may_move_void=false"
req "apollyon_may_modify_validator_state=false"
req "apollyon_may_perform_live_mutation=false"

req "operator_final_authority=true"
req "validator_truth_doctrine=honest_validators_speak_truth"
req "host_guard_required_for_cross_box=true"
req "precision_source_of_truth_host=zoso-Precision-Tower-7810"
req "alienware_cross_box_host=zoso-Alienware-Aurora-R7"

echo "VOID_APOLLYON_AUTH_LOOP_INDEX_V1_GREEN"
