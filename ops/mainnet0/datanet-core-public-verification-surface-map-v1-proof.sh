#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-public-verification-surface-map-v1.md"

echo "marker=VOID_DATANET_CORE_PUBLIC_VERIFICATION_SURFACE_MAP_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_PUBLIC_VERIFICATION_SURFACE_MAP_DOC_V1' "$doc"
grep -q 'datanet_core_public_verification_surface_map_created_now=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_terminal_safe=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_static_only=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_base_head=10459755' "$doc"
grep -q 'datanet_core_public_verification_surface_map_entry_point_cross_box_green=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_handoff_indexed=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_route_safety_index_indexed=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_object_integrity_summary_indexed=true' "$doc"
grep -q 'datanet_core_public_verification_surface_map_runs_route_calls=false' "$doc"
grep -q 'datanet_core_public_verification_surface_map_runs_object_fetch=false' "$doc"
grep -q 'datanet_core_public_verification_surface_map_runs_duplicate_guard=false' "$doc"
grep -q 'datanet_core_public_verification_surface_map_runs_full_live_rollup=false' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_public_verification_surface_map_created_now=true"
echo "datanet_core_public_verification_surface_map_terminal_safe=true"
echo "datanet_core_public_verification_surface_map_static_only=true"
echo "datanet_core_public_verification_surface_map_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_public_verification_surface_map_proof_scope=tiny_static_doc_only_no_command_reveal_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_PUBLIC_VERIFICATION_SURFACE_MAP_PROOF_V1_GREEN"
