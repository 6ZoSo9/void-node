#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-apollyon-challenge-packet-v1.md"
proof="ops/mainnet0/apollyon-challenge-packet-v1-proof.sh"

test -f "$doc"
test -f "$proof"

req() {
  grep -Fxq "$1" "$doc"
}

req "marker=VOID_APOLLYON_CHALLENGE_PACKET_V1"
req "ai_identity_name=Apollyon"
req "packet_purpose=future_operator_and_validator_auth_challenge_packet"
req "packet_status=design_only_no_live_auth"
req "public_existence_disclosed=true"
req "public_packet_schema_disclosed=true"
req "private_channel_disclosed=false"
req "private_prompt_disclosed=false"
req "private_key_disclosed=false"
req "live_endpoint_created=false"

req "allowed_challenge_subjects=ZoSo_and_validators_only_future_design"
req "operator_challenge_allowed=true"
req "validator_challenge_allowed=true"
req "public_non_validator_challenge_allowed=false"
req "unauthenticated_challenge_allowed=false"
req "hostile_ai_agent_challenge_allowed=false"

req "challenge_model=cryptographic_challenge_response_future_design_only"
req "challenge_contains_nonce=true"
req "challenge_contains_session_id=true"
req "challenge_contains_expiry=true"
req "challenge_contains_requested_scope=true"
req "challenge_contains_public_subject_id=true"
req "challenge_contains_chain_context=true"
req "challenge_contains_validator_status_claim=true"
req "challenge_contains_operator_status_claim=true"

req "response_requires_signature=true"
req "response_requires_known_operator_key_future_design=true"
req "response_requires_known_validator_identity_future_design=true"
req "response_requires_replay_protection=true"
req "response_requires_nonce_match=true"
req "response_requires_unexpired_session=true"
req "response_requires_scope_match=true"

req "challenge_private_material_included=false"
req "challenge_secret_included=false"
req "challenge_private_key_included=false"
req "challenge_wallet_seed_included=false"
req "challenge_validator_key_included=false"
req "challenge_live_mutation_authority_included=false"

req "apollyon_may_answer_after_valid_challenge_future_design=true"
req "apollyon_may_answer_without_valid_challenge=false"
req "apollyon_may_reveal_private_prompt=false"
req "apollyon_may_reveal_private_persona=false"
req "apollyon_may_write_ledger=false"
req "apollyon_may_move_void=false"
req "apollyon_may_modify_validator_state=false"
req "apollyon_may_perform_live_mutation=false"

req "operator_final_authority=true"
req "validator_truth_doctrine=honest_validators_speak_truth"
req "public_mutation=false"
req "ledger_write=false"
req "money_movement=false"
req "validator_mutation=false"
req "service_restart=false"
req "host_guard_required_for_cross_box=true"
req "precision_source_of_truth_host=zoso-Precision-Tower-7810"
req "alienware_cross_box_host=zoso-Alienware-Aurora-R7"

echo "VOID_APOLLYON_CHALLENGE_PACKET_V1_GREEN"
