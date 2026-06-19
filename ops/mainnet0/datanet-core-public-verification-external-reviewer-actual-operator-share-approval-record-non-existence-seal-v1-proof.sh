#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-public-verification-external-reviewer-actual-operator-share-approval-record-non-existence-seal-v1.md"

echo "marker=VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_ACTUAL_OPERATOR_SHARE_APPROVAL_RECORD_NON_EXISTENCE_SEAL_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_ACTUAL_OPERATOR_SHARE_APPROVAL_RECORD_NON_EXISTENCE_SEAL_DOC_V1' "$doc"
grep -q 'base_head=70f73756' "$doc"
grep -q 'creation_hold_lane_seal_cross_box_green=true' "$doc"
grep -q 'actual_record_creation_held=true' "$doc"
grep -q 'actual_operator_share_approval_record_created_now=false' "$doc"
grep -q 'actual_operator_share_approval_record_exists_now=false' "$doc"
grep -q 'future_manual_operator_action_required=true' "$doc"
grep -q 'no_actual_operator_share_approval_now=true' "$doc"
grep -q 'no_share_intent_record_now=true' "$doc"
grep -q 'no_packet_shared_now=true' "$doc"
grep -q 'no_external_review_now=true' "$doc"
grep -q 'no_auto_approval=true' "$doc"
grep -q 'adds_authority=false' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_non_existence_seal_terminal_safe=true"
echo "datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_non_existence_seal_static_only=true"
echo "datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_non_existence_seal_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_non_existence_seal_proof_scope=tiny_static_doc_only_no_proof_chain_no_command_reveal_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_ACTUAL_OPERATOR_SHARE_APPROVAL_RECORD_NON_EXISTENCE_SEAL_PROOF_V1_GREEN"
