#!/usr/bin/env bash
set -euo pipefail
set +H

name="datanet-core-public-verification-external-reviewer-actual-operator-share-approval-record-creation-decision-boundary-closeout-v1"
doc="docs/public/public-node-${name}.md"
pfx="datanet_core_public_verification_external_reviewer_actual_operator_share_approval_record_creation_decision_boundary_closeout_"
u="VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_ACTUAL_OPERATOR_SHARE_APPROVAL_RECORD"

echo "marker=${u}_CREATION_DECISION_BOUNDARY_CLOSEOUT_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
grep -q "${u}_CREATION_DECISION_BOUNDARY_CLOSEOUT_DOC_V1" "$doc"

for suffix in \
  created_now=true \
  terminal_safe=true \
  static_only=true \
  base_head=9775e6ec \
  decision_boundary_cross_box_green=true \
  packet_set_documented=true \
  record_absence_sealed=true \
  creation_decision_boundary_closed=true \
  actual_record_creation_held=true \
  future_manual_operator_action_required=true \
  actual_operator_share_approval_record_created_now=false \
  actual_operator_share_approval_record_exists_now=false \
  no_actual_operator_share_approval_now=true \
  no_share_intent_record_now=true \
  no_packet_shared_now=true \
  no_reviewer_contact_now=true \
  no_external_review_now=true \
  no_reviewer_result_accepted_now=true \
  no_auto_approval=true \
  adds_authority=false
do
  grep -q "${pfx}${suffix}" "$doc"
done

grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "${pfx}terminal_safe=true"
echo "${pfx}static_only=true"
echo "${pfx}adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "${pfx}proof_scope=tiny_static_doc_only_no_proof_chain_no_command_reveal_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "${u}_CREATION_DECISION_BOUNDARY_CLOSEOUT_PROOF_V1_GREEN"
