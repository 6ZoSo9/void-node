#!/usr/bin/env bash
set -euo pipefail
set +H

name="datanet-core-public-verification-external-reviewer-actual-operator-share-approval-record-manual-reviewer-candidate-shortlist-hold-v1"
doc="docs/public/public-node-${name}.md"
pfx="datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_manual_reviewer_candidate_shortlist_hold_"
u="VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_ACTUAL_OPERATOR_SHARE_APPROVAL_RECORD"

echo "marker=${u}_MANUAL_REVIEWER_CANDIDATE_SHORTLIST_HOLD_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
grep -q "${u}_MANUAL_REVIEWER_CANDIDATE_SHORTLIST_HOLD_DOC_V1" "$doc"

for suffix in \
  created_now=true \
  terminal_safe=true \
  static_only=true \
  base_head=4a9b2597 \
  manual_reviewer_selection_criteria_cross_box_green=true \
  candidate_shortlist_hold_recorded_now=true \
  shortlist_lane_held=true \
  future_shortlist_creation_required=true \
  manual_operator_review_required_before_shortlist=true \
  reviewer_shortlist_created_now=false \
  reviewer_candidate_named_now=false \
  reviewer_selected_now=false \
  reviewer_contact_now=false \
  packet_shared_now=false \
  external_review_now=false \
  reviewer_result_accepted_now=false \
  actual_operator_share_approval_record_created_now=false \
  actual_operator_share_approval_record_exists_now=false \
  actual_operator_share_approval_now=false \
  auto_contact=false \
  auto_share=false \
  auto_approval=false \
  adds_authority=false
do
  grep -q "${pfx}${suffix}" "$doc"
done

grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "${pfx}terminal_safe=true"
echo "${pfx}static_only=true"
echo "${pfx}candidate_shortlist_hold_recorded_now=true"
echo "${pfx}reviewer_shortlist_created_now=false"
echo "${pfx}reviewer_candidate_named_now=false"
echo "${pfx}reviewer_selected_now=false"
echo "${pfx}reviewer_contact_now=false"
echo "${pfx}packet_shared_now=false"
echo "${pfx}external_review_now=false"
echo "${pfx}actual_operator_share_approval_record_created_now=false"
echo "${pfx}adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "${pfx}proof_scope=tiny_static_doc_only_shortlist_hold_no_shortlist_no_reviewer_selected_no_contact_no_share_no_approval_no_mutation_no_ledger_write_no_wc_award"
echo "${u}_MANUAL_REVIEWER_CANDIDATE_SHORTLIST_HOLD_PROOF_V1_GREEN"
