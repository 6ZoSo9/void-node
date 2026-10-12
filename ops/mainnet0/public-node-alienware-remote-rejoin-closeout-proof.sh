#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-alienware-remote-rejoin-closeout.md"

echo "VOID_PUBLIC_NODE_ALIENWARE_REMOTE_REJOIN_CLOSEOUT_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"

test -f "$DOC"

grep -Fq "VOID_PUBLIC_NODE_ALIENWARE_REMOTE_REJOIN_CLOSEOUT_V1" "$DOC"
grep -Fq "zoso@100.122.79.39" "$DOC"
grep -Fq "cb1ed780" "$DOC"
grep -Fq "ckpt-public-node-first-external-tester-wc-operator-decision-packet-green-20260614-074211" "$DOC"
grep -Fq "http://100.122.79.39:4100" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_PROOF_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN" "$DOC"
grep -Fq "alienware_live_status_rollup_rejoin_after_precision_real_data_copy_green=true" "$DOC"

grep -Fq "public_upload=false" "$DOC"
grep -Fq "operator_local_import_only=true" "$DOC"
grep -Fq "public_read_only=true" "$DOC"
grep -Fq "trusted_as_network_truth=false" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"
grep -Fq "current_decision_state=not_decided" "$DOC"

echo "alienware_remote_rejoin_closeout_doc_green=true"
echo "alienware_remote_rejoin_closeout_safety_boundary_green=true"
echo "VOID_PUBLIC_NODE_ALIENWARE_REMOTE_REJOIN_CLOSEOUT_PROOF_V1_GREEN"
