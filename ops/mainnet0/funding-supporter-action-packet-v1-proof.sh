#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-funding-supporter-action-packet-v1.md"
focus_doc="docs/public/public-node-funding-engine-focus-packet-v1.md"
matrix_doc="docs/public/public-node-funding-needs-matrix-v1.md"

test -f "$doc"
test -f "$focus_doc"
test -f "$matrix_doc"

req() {
  grep -Fxq -- "$1" "$2"
}

req "marker=VOID_FUNDING_SUPPORTER_ACTION_PACKET_V1" "$doc"
req "packet_status=public_docs_only_no_funds_moved_no_payment_link_created" "$doc"
req "packet_purpose=explain_what_a_supporter_can_do_next_without_promising_returns" "$doc"

req "supporter_action_3=choose_a_support_axis" "$doc"
req "supporter_action_4=ask_for_a_reviewable_support_path" "$doc"
req "support_axis_1=work_credits_review_and_accounting" "$doc"
req "support_axis_2=datanet_useful_dataset_and_tester_tasks" "$doc"
req "support_axis_3=validator_readiness_and_candidate_surface" "$doc"

req "support_path_step_3=supporter_requests_operator_review" "$doc"
req "operator_response_4=converted_to_public_task_packet" "$doc"
req "public_receipt_expected_if_support_accepted=true" "$doc"
req "public_receipt_does_not_equal_wc_award=true" "$doc"
req "public_receipt_does_not_equal_token_sale=true" "$doc"
req "public_receipt_does_not_equal_validator_slot=true" "$doc"
req "public_receipt_does_not_equal_investment_contract=true" "$doc"

req "no_return_promise=true" "$doc"
req "no_automatic_fulfillment=true" "$doc"
req "no_automatic_wc_award=true" "$doc"
req "no_validator_admission_promise=true" "$doc"
req "no_public_mutation_access=true" "$doc"
req "no_funds_moved_by_this_packet=true" "$doc"

req "marker=VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$focus_doc"
req "marker=VOID_FUNDING_NEEDS_MATRIX_V1" "$matrix_doc"

echo "VOID_FUNDING_SUPPORTER_ACTION_PACKET_V1_GREEN"
