#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-node-funding-packet-index-v1.md"
support_doc="docs/public/funding-support-v1.md"
focus_doc="docs/public/public-node-funding-engine-focus-packet-v1.md"
matrix_doc="docs/public/public-node-funding-needs-matrix-v1.md"
action_doc="docs/public/public-node-funding-supporter-action-packet-v1.md"

test -f "$doc"
test -f "$support_doc"
test -f "$focus_doc"
test -f "$matrix_doc"
test -f "$action_doc"

req() {
  grep -Fxq -- "$1" "$2"
}

req "marker=VOID_FUNDING_PACKET_INDEX_V1" "$doc"
req "index_status=public_docs_only_no_funds_moved_no_payment_link_created" "$doc"
req "index_purpose=collect_the_public_funding_packets_into_one_readable_ladder" "$doc"

req "packet_1_path=docs/public/funding-support-v1.md" "$doc"
req "packet_2_marker=VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$doc"
req "packet_3_marker=VOID_FUNDING_NEEDS_MATRIX_V1" "$doc"
req "packet_4_marker=VOID_FUNDING_SUPPORTER_ACTION_PACKET_V1" "$doc"

req "funding_ladder_step_1=understand_what_VOID_is_building" "$doc"
req "funding_ladder_step_2=understand_what_funding_unlocks" "$doc"
req "funding_ladder_step_3=choose_a_support_axis" "$doc"
req "funding_ladder_step_4=request_operator_review" "$doc"
req "funding_ladder_step_5=verify_public_proofs_and_receipts" "$doc"

req "no_return_promise=true" "$doc"
req "no_automatic_fulfillment=true" "$doc"
req "no_automatic_wc_award=true" "$doc"
req "no_validator_admission_promise=true" "$doc"
req "no_public_mutation_access=true" "$doc"
req "no_funds_moved_by_this_index=true" "$doc"

req "marker=VOID_FUNDING_ENGINE_FOCUS_PACKET_V1" "$focus_doc"
req "marker=VOID_FUNDING_NEEDS_MATRIX_V1" "$matrix_doc"
req "marker=VOID_FUNDING_SUPPORTER_ACTION_PACKET_V1" "$action_doc"

echo "VOID_FUNDING_PACKET_INDEX_V1_GREEN"
