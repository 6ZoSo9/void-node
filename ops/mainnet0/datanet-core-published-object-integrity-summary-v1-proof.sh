#!/usr/bin/env bash
set -euo pipefail
set +H

doc="docs/public/public-node-datanet-core-published-object-integrity-summary-v1.md"

echo "marker=VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"

test -f "$doc"

grep -q 'VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_DOC_V1' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_created_now=true' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_terminal_safe=true' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_static_only=true' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_runs_object_fetch=false' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_runs_duplicate_guard=false' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_runs_full_live_rollup=false' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_published_object_fetch_head=385d6d8' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_duplicate_guard_head=12d41ed1' "$doc"
grep -q 'datanet_core_published_object_integrity_summary_peer_pin_closeout_head=609d63ea' "$doc"
grep -q 'public_mutation=false' "$doc"
grep -q 'ledger_write=false' "$doc"
grep -q 'wc_credit_award=false' "$doc"

echo "datanet_core_published_object_integrity_summary_created_now=true"
echo "datanet_core_published_object_integrity_summary_terminal_safe=true"
echo "datanet_core_published_object_integrity_summary_static_only=true"
echo "datanet_core_published_object_integrity_summary_adds_authority=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "datanet_core_published_object_integrity_summary_proof_scope=tiny_static_doc_only_no_tag_scan_no_object_fetch_no_duplicate_guard_no_full_rollup"
echo "VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_PROOF_V1_GREEN"
