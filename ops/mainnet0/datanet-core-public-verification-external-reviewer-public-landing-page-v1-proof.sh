#!/usr/bin/env bash
set -euo pipefail
set +H

name="datanet-core-public-verification-external-reviewer-public-landing-page-v1"
doc="docs/public/public-node-${name}.md"
pfx="datanet_core_public_verification_external_reviewer_public_landing_page_"
u="VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_PUBLIC_LANDING_PAGE"

evidence_name="datanet-core-public-verification-external-reviewer-evidence-bundle-v1"
evidence_doc="docs/public/public-node-${evidence_name}.md"
evidence_proof="ops/mainnet0/${evidence_name}-proof.sh"
evidence_u="VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_EVIDENCE_BUNDLE"
evidence_out="/tmp/void-proof-external-reviewer-public-landing-page-evidence-bundle.out"

echo "marker=${u}_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"
test -f "$evidence_doc"
test -x "$evidence_proof"

grep -q "${u}_DOC_V1" "$doc"

bash "$evidence_proof" > "$evidence_out"
grep -q "${evidence_u}_PROOF_V1_GREEN" "$evidence_out"
grep -q 'external_reviewer_evidence_bundle_public_reviewer_safe=true' "$evidence_out"
grep -q 'external_reviewer_evidence_bundle_external_reviewer_readable=true' "$evidence_out"
grep -q 'external_reviewer_evidence_bundle_seed_stage_operator_heavy_disclosed=true' "$evidence_out"
grep -q 'external_reviewer_evidence_bundle_reveal_decision_pending=true' "$evidence_out"
grep -q 'operator_reveal_command_final_approval_granted_now=false' "$evidence_out"
grep -q 'operator_execute_command_revealed_now=false' "$evidence_out"
grep -q 'operator_execute_command_printed_now=false' "$evidence_out"
grep -q 'operator_execute_command_executed_now=false' "$evidence_out"
grep -q 'candidate_record_entry_written_now=false' "$evidence_out"
grep -q 'packet_shared_now=false' "$evidence_out"
grep -q 'public_mutation=false' "$evidence_out"
grep -q 'ledger_write=false' "$evidence_out"
grep -q 'wc_credit_award=false' "$evidence_out"

for suffix in \
  created_now=true \
  terminal_safe=true \
  static_only=true \
  current_head=7fe39378 \
  evidence_bundle_cross_box_green=true \
  public_reviewer_safe=true \
  external_reviewer_readable=true \
  seed_stage_operator_heavy_disclosed=true \
  third_party_audit_claimed=false \
  production_grade_decentralization_claimed=false \
  reveal_decision_pending=true \
  operator_reveal_command_final_approval_granted_now=false \
  operator_reveal_command_held=true \
  operator_execute_command_held=true \
  operator_execute_command_revealed_now=false \
  operator_execute_command_printed_now=false \
  operator_execute_command_executed_now=false \
  candidate_record_entry_written_now=false \
  approval_packet_contains_candidate_identity=false \
  reviewer_candidate_record_created_now=false \
  reviewer_selected_now=false \
  reviewer_contact_now=false \
  packet_shared_now=false \
  external_review_now=false \
  adds_authority=false
do
  grep -q "${pfx}${suffix}" "$doc"
done

grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "${pfx}terminal_safe=true"
echo "${pfx}static_only=true"
echo "${pfx}created_now=true"
echo "${pfx}current_head=7fe39378"
echo "${pfx}evidence_bundle_cross_box_green=true"
echo "${pfx}public_reviewer_safe=true"
echo "${pfx}external_reviewer_readable=true"
echo "${pfx}seed_stage_operator_heavy_disclosed=true"
echo "${pfx}third_party_audit_claimed=false"
echo "${pfx}production_grade_decentralization_claimed=false"
echo "${pfx}reveal_decision_pending=true"
echo "${pfx}operator_reveal_command_final_approval_granted_now=false"
echo "${pfx}operator_reveal_command_held=true"
echo "${pfx}operator_execute_command_held=true"
echo "${pfx}operator_execute_command_revealed_now=false"
echo "${pfx}operator_execute_command_printed_now=false"
echo "${pfx}operator_execute_command_executed_now=false"
echo "${pfx}candidate_record_entry_written_now=false"
echo "${pfx}approval_packet_contains_candidate_identity=false"
echo "${pfx}reviewer_candidate_record_created_now=false"
echo "${pfx}reviewer_selected_now=false"
echo "${pfx}reviewer_contact_now=false"
echo "${pfx}packet_shared_now=false"
echo "${pfx}external_review_now=false"
echo "${pfx}adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "${pfx}proof_scope=single_static_external_reviewer_public_landing_page_points_to_evidence_bundle_no_final_reveal_approval_no_command_reveal_no_candidate_identity_no_reviewer_contact_no_packet_share_no_mutation_no_ledger_write_no_wc_award"
echo "${u}_PROOF_V1_GREEN"
