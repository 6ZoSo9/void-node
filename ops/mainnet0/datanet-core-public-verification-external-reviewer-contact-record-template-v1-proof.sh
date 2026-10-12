#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-public-verification-external-reviewer-contact-record-template-v1.md"

echo "marker=VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_CONTACT_RECORD_TEMPLATE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_CONTACT_RECORD_TEMPLATE_DOC_V1' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_created_now=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_terminal_safe=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_static_only=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_base_head=a9a5d713' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_dispatch_boundary_cross_box_green=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_fields_documented=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_no_contact_now=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_no_acknowledgement_now=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_no_result_now=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_no_decision_record_now=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_auto_acceptance=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_auto_ingest=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_adds_authority=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_peer_pin_exact_command_reveal_held=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_runs_proof_chain=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_runs_command_reveal=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_runs_route_calls=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_runs_object_fetch=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_runs_duplicate_guard=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_contact_record_template_runs_full_live_rollup=false' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_public_verification_external_reviewer_contact_record_template_terminal_safe=true"
echo "datanet_core_public_verification_external_reviewer_contact_record_template_static_only=true"
echo "datanet_core_public_verification_external_reviewer_contact_record_template_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_public_verification_external_reviewer_contact_record_template_proof_scope=tiny_static_doc_only_no_proof_chain_no_command_reveal_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_CONTACT_RECORD_TEMPLATE_PROOF_V1_GREEN"
