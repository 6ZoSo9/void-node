#!/usr/bin/env bash
set -euo pipefail
set +H

readme="docs/public/README.md"
landing="docs/public/public-node-datanet-core-public-verification-external-reviewer-public-landing-page-v1.md"
evidence="docs/public/public-node-datanet-core-public-verification-external-reviewer-evidence-bundle-v1.md"
landing_proof="ops/mainnet0/datanet-core-public-verification-external-reviewer-public-landing-page-v1-proof.sh"
u="VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_DOCS_INDEX_POINTER"

echo "marker=${u}_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$readme"
test -f "$landing"
test -f "$evidence"
test -x "$landing_proof"

grep -q "VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_DOCS_INDEX_POINTER_V1" "$readme"
grep -q "public-node-datanet-core-public-verification-external-reviewer-public-landing-page-v1.md" "$readme"
grep -q "public-node-datanet-core-public-verification-external-reviewer-evidence-bundle-v1.md" "$readme"
grep -q "reveal decision pending" "$readme"
grep -q "final reveal approval not granted" "$readme"
grep -q "no command reveal, print, or execute" "$readme"
grep -q "no candidate identity" "$readme"
grep -q "no candidate record write" "$readme"
grep -q "no reviewer contact" "$readme"
grep -q "no packet share" "$readme"
grep -q "no public mutation" "$readme"
grep -q "no ledger write" "$readme"
grep -q "no Work Credit award" "$readme"

bash "$landing_proof" >/tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_PUBLIC_LANDING_PAGE_PROOF_V1_GREEN" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "reveal_decision_pending=true" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "operator_reveal_command_final_approval_granted_now=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "operator_execute_command_revealed_now=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "candidate_record_entry_written_now=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "packet_shared_now=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "public_mutation=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "ledger_write=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out
grep -q "wc_credit_award=false" /tmp/void-proof-external-reviewer-docs-index-pointer-landing.out

echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_terminal_safe=true"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_static_docs_index_only=true"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_created_now=true"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_points_to_public_landing_page=true"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_points_to_evidence_bundle=true"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_reveal_decision_pending=true"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_operator_reveal_command_final_approval_granted_now=false"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_operator_execute_command_revealed_now=false"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_candidate_record_entry_written_now=false"
echo "datanet_core_public_verification_external_reviewer_docs_index_pointer_packet_shared_now=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "${u}_PROOF_V1_GREEN"
