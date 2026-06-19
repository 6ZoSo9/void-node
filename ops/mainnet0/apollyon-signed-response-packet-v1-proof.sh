#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-signed-response-packet-v1.md"
proof="ops/mainnet0/apollyon-signed-response-packet-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_SIGNED_RESPONSE_PACKET_V1"
req "ai_identity_name=Apollyon"
req "packet_purpose=future_signed_response_after_valid_operator_or_validator_challenge"
req "packet_status=design_only_no_live_response"
req "requires_valid_challenge_packet=true"
req "challenge_packet_marker=VOID_APOLLYON_CHALLENGE_PACKET_V1"

req "allowed_recipients=ZoSo_and_validators_only_future_design"
req "operator_response_allowed=true"
req "validator_response_allowed=true"
req "public_response_allowed=false"
req "unauthenticated_response_allowed=false"
req "hostile_ai_agent_response_allowed=false"

req "response_model=cryptographic_signed_response_future_design_only"
req "response_contains_challenge_nonce=true"
req "response_contains_session_id=true"
req "response_contains_expiry=true"
req "response_contains_requested_scope=true"
req "response_contains_subject_id=true"
req "response_contains_auth_result=true"
req "response_contains_response_scope=true"
req "response_contains_public_safety_boundary=true"
req "response_contains_no_private_prompt=true"
req "response_contains_no_private_key=true"

req "response_requires_apollyon_signature_future_design=true"
req "response_requires_nonce_match=true"
req "response_requires_session_match=true"
req "response_requires_unexpired_session=true"
req "response_requires_scope_match=true"
req "response_requires_operator_or_validator_auth=true"
req "response_replay_protection_required=true"

req "private_prompt_exposed=false"
req "private_persona_exposed=false"
req "private_key_exposed=false"
req "operator_private_channel_exposed=false"
req "validator_private_channel_exposed=false"
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

echo "VOID_APOLLYON_SIGNED_RESPONSE_PACKET_V1_GREEN"
