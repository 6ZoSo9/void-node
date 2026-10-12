#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-route-safety-index-v1.md"

echo "marker=VOID_DATANET_CORE_ROUTE_SAFETY_INDEX_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_ROUTE_SAFETY_INDEX_DOC_V1' "$doc"
grep -q 'datanet_core_route_safety_index_created_now=true' "$doc"
grep -q 'datanet_core_route_safety_index_terminal_safe=true' "$doc"
grep -q 'datanet_core_route_safety_index_static_only=true' "$doc"
grep -q 'datanet_core_route_safety_index_runs_route_calls=false' "$doc"
grep -q 'datanet_core_route_safety_index_runs_object_fetch=false' "$doc"
grep -q 'datanet_core_route_safety_index_runs_duplicate_guard=false' "$doc"
grep -q 'datanet_core_route_safety_index_runs_full_live_rollup=false' "$doc"
grep -q 'datanet_core_route_safety_index_base_head=aa970f02' "$doc"
grep -q 'datanet_core_route_safety_index_read_only_posture=true' "$doc"
grep -q 'datanet_core_route_safety_index_no_raw_path_construction=true' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_route_safety_index_created_now=true"
echo "datanet_core_route_safety_index_terminal_safe=true"
echo "datanet_core_route_safety_index_static_only=true"
echo "datanet_core_route_safety_index_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_route_safety_index_proof_scope=tiny_static_doc_only_no_route_calls_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_ROUTE_SAFETY_INDEX_PROOF_V1_GREEN"
