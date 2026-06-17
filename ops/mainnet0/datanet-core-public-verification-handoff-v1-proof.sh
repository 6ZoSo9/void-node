#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-public-verification-handoff-v1.md"

echo "marker=VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_DOC_V1' "$doc"
grep -q 'datanet_core_public_verification_handoff_created_now=true' "$doc"
grep -q 'datanet_core_public_verification_handoff_terminal_safe=true' "$doc"
grep -q 'datanet_core_public_verification_handoff_static_only=true' "$doc"
grep -q 'datanet_core_public_verification_handoff_base_head=b4220ecd' "$doc"
grep -q 'datanet_core_public_verification_handoff_peer_pin_closed=true' "$doc"
grep -q 'datanet_core_public_verification_handoff_published_object_integrity_sealed=true' "$doc"
grep -q 'datanet_core_public_verification_handoff_route_safety_index_sealed=true' "$doc"
grep -q 'datanet_core_public_verification_handoff_next_safe_start_head=b4220ecd' "$doc"
grep -q 'datanet_core_public_verification_handoff_runs_route_calls=false' "$doc"
grep -q 'datanet_core_public_verification_handoff_runs_object_fetch=false' "$doc"
grep -q 'datanet_core_public_verification_handoff_runs_duplicate_guard=false' "$doc"
grep -q 'datanet_core_public_verification_handoff_runs_full_live_rollup=false' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_public_verification_handoff_created_now=true"
echo "datanet_core_public_verification_handoff_terminal_safe=true"
echo "datanet_core_public_verification_handoff_static_only=true"
echo "datanet_core_public_verification_handoff_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_public_verification_handoff_proof_scope=tiny_static_doc_only_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_PROOF_V1_GREEN"
