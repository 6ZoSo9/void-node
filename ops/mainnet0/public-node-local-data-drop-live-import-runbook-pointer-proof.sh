#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop.md"
RUNBOOK="docs/public/public-node-local-data-drop-live-import-runbook.md"

echo "=== VOID Public Node Local Data Drop Live Import Runbook Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -f "$RUNBOOK"
test -x ops/mainnet0/public-node-local-data-drop-live-import-runbook-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_POINTER_DOC_V1" "$DOC"
grep -Fq "Live import is the deliberate operator path" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-live-import-runbook.md" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1" "$RUNBOOK"
grep -Fq "Do not run live import casually" "$RUNBOOK"

bash ops/mainnet0/public-node-local-data-drop-live-import-runbook-closeout-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_POINTER_V1_GREEN"
