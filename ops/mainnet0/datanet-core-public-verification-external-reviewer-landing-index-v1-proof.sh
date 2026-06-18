#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-public-verification-external-reviewer-landing-index-v1.md"

echo "marker=VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_LANDING_INDEX_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_LANDING_INDEX_DOC_V1' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_created_now=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_terminal_safe=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_static_only=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_base_head=7b22cd9c' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_share_packet_cross_box_green=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_start_order_documented=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_supporting_docs_documented=true' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_runs_proof_chain=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_runs_route_calls=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_runs_object_fetch=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_runs_duplicate_guard=false' "$doc"
grep -q 'datanet_core_public_verification_external_reviewer_landing_index_runs_full_live_rollup=false' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_public_verification_external_reviewer_landing_index_created_now=true"
echo "datanet_core_public_verification_external_reviewer_landing_index_terminal_safe=true"
echo "datanet_core_public_verification_external_reviewer_landing_index_static_only=true"
echo "datanet_core_public_verification_external_reviewer_landing_index_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_public_verification_external_reviewer_landing_index_proof_scope=tiny_static_doc_only_no_proof_chain_no_command_reveal_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_LANDING_INDEX_PROOF_V1_GREEN"
