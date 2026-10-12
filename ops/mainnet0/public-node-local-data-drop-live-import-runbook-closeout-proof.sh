#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-runbook-closeout.md"

echo "=== VOID Public Node Local Data Drop Live Import Runbook Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-live-import-runbook-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_CLOSEOUT_V1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-live-import-runbook.md" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1" "$DOC"
grep -Fq "4164503c" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-live-import-runbook-green-20260612-142934" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1_GREEN" "$DOC"
grep -Fq "does not mutate live data" "$DOC"
grep -Fq "public surface mutation" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-live-import-runbook-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_CLOSEOUT_V1_GREEN"
