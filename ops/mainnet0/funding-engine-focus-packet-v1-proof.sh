#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-funding-engine-focus-packet-v1.md"
funding_doc="docs/public/funding-support-v1.md"
buy_guard_doc="docs/public/buy-void-pool-empty-guard-plan.md"

for f in "$doc" "$funding_doc" "$buy_guard_doc"; do
  test -f "$f"
done

req() {
  grep -Fxq -- "$1" "$2"
}

req "marker=VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$doc"
req "packet_status=public_funding_focus_packet_docs_only_no_funds_moved" "$doc"
req "packet_purpose=explain_why_funding_wc_datanet_and_validators_are_the_core_engine" "$doc"

req "requires_funding_support_doc=true" "$doc"
req "funding_support_doc=docs/public/funding-support-v1.md" "$doc"
req "requires_buy_void_pool_guard_plan=true" "$doc"
req "buy_void_pool_guard_doc=docs/public/buy-void-pool-empty-guard-plan.md" "$doc"

req "core_focus_1=funding" "$doc"
req "core_focus_2=work_credits" "$doc"
req "core_focus_3=datanet" "$doc"
req "core_focus_4=validators" "$doc"

req "funding_is_resource_layer=true" "$doc"
req "work_credits_are_verified_contribution_accounting=true" "$doc"
req "datanet_is_useful_data_service_layer=true" "$doc"
req "validators_are_security_and_truth_layer=true" "$doc"
req "void_is_native_currency_and_security_asset=true" "$doc"

req "engine_step_1=funding_supplies_operator_resources" "$doc"
req "engine_step_3=work_credits_account_for_verified_contributions" "$doc"
req "engine_step_4=verified_contributions_expand_datanet_utility" "$doc"
req "engine_step_6=validators_secure_and_witness_the_system" "$doc"
req "engine_step_8=trust_supports_more_funding_and_participation" "$doc"

req "funding_does_not_skip_work_verification=true" "$doc"
req "funding_does_not_award_work_credits_automatically=true" "$doc"
req "funding_does_not_open_public_mutation=true" "$doc"
req "funding_does_not_create_return_promise=true" "$doc"

req "funding_unlock_1=more_operator_time" "$doc"
req "funding_unlock_4=more_work_credit_review_and_accounting_surfaces" "$doc"
req "funding_unlock_5=more_validator_readiness_docs_and_proofs" "$doc"
req "funding_unlock_8=more_infrastructure_redundancy" "$doc"

req "near_term_priority_1=make_funding_request_path_clear_and_guarded" "$doc"
req "near_term_priority_2=make_work_credit_issuance_lane_reviewable" "$doc"
req "near_term_priority_3=make_datanet_use_cases_obvious_to_external_testers" "$doc"
req "near_term_priority_4=make_validator_readiness_publicly_auditable" "$doc"

req "public_claim_production_grade=false" "$doc"
req "public_claim_third_party_audited=false" "$doc"
req "public_claim_automatic_rewards=false" "$doc"
req "public_claim_investment_returns=false" "$doc"
req "public_claim_unrestricted_public_mutation=false" "$doc"

req "funding_message=VOID_is_building_a_verifiable_work_data_and_validator_network_not_a_hype_funnel" "$doc"

req "public_evaluation_path_2=verify_datanet_challenge_outputs" "$doc"
req "public_evaluation_path_3=review_work_credit_boundaries" "$doc"
req "public_evaluation_path_4=review_validator_candidate_policy" "$doc"
req "supporter_action_5=help_identify_useful_datasets" "$doc"
req "supporter_action_6=prepare_validator_or_node_interest" "$doc"

req "# VOID Network funding" "$funding_doc"
req "- DataNet storage/readback work" "$funding_doc"
req "- Work Credits loop development" "$funding_doc"
req "- do not send funds expecting automatic delivery" "$funding_doc"

req "# Buy VOID Pool-Empty Guard Plan" "$buy_guard_doc"
req "This plan does not move funds." "$buy_guard_doc"
req "This plan does not alter Buy VOID fulfillment." "$buy_guard_doc"

echo "VOID_FUNDING_ENGINE_FOCUS_PACKET_V1_GREEN"
