#!/usr/bin/env bash
set -euo pipefail
set +H

name="datanet-core-public-verification-external-reviewer-actual-operator-share-approval-record-manual-reviewer-share-candidate-manifest-v1"
doc="docs/public/public-node-${name}.md"
pfx="datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_manual_reviewer_share_candidate_manifest_"
u="VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_ACTUAL_OPERATOR_SHARE_APPROVAL_RECORD"

echo "marker=${u}_MANUAL_REVIEWER_SHARE_CANDIDATE_MANIFEST_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
grep -q "${u}_MANUAL_REVIEWER_SHARE_CANDIDATE_MANIFEST_DOC_V1" "$doc"

for suffix in \
  created_now=true \
  terminal_safe=true \
  static_only=true \
  base_head=3364d3ba \
  manual_reviewer_share_intent_record_cross_box_green=true \
  candidate_manifest_recorded_now=true \
  candidate_materials_listed_now=true \
  candidate_public_surface_final_seal_included=true \
  candidate_readiness_packet_included=true \
  candidate_intent_record_included=true \
  candidate_proof_markers_included=true \
  candidate_cross_box_tags_included=true \
  candidate_safety_boundary_included=true \
  candidate_non_execution_boundary_included=true \
  manual_operator_review_required_before_share=true \
  future_manual_operator_action_required=true \
  packet_assembled_for_delivery_now=false \
  packet_shared_now=false \
  reviewer_contact_now=false \
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
echo "${pfx}candidate_manifest_recorded_now=true"
echo "${pfx}packet_assembled_for_delivery_now=false"
echo "${pfx}packet_shared_now=false"
echo "${pfx}reviewer_contact_now=false"
echo "${pfx}external_review_now=false"
echo "${pfx}actual_operator_share_approval_record_created_now=false"
echo "${pfx}adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "${pfx}proof_scope=tiny_static_doc_only_candidate_manifest_no_delivery_packet_no_contact_no_share_no_approval_no_mutation_no_ledger_write_no_wc_award"
echo "${u}_MANUAL_REVIEWER_SHARE_CANDIDATE_MANIFEST_PROOF_V1_GREEN"
