#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop.md"
STATUS_DOC="docs/public/public-node-local-data-drop-import-stack-status.md"

echo "=== VOID Public Node Local Data Drop Import Stack Status Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -f "$STATUS_DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-stack-status-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_POINTER_DOC_V1" "$DOC"
grep -Fq "The Local Data Drop import stack status summarizes the current proven import discipline" "$DOC"
grep -Fq "scratch imports are safe proof/test lanes" "$DOC"
grep -Fq "live import is a deliberate public mutation lane" "$DOC"
grep -Fq "live weighted object count remains \`1\`" "$DOC"
grep -Fq "Precision-only green / Alienware deferred / cross-box pending" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-import-stack-status.md" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_V1" "$STATUS_DOC"
grep -Fq "does not claim cross-box green" "$STATUS_DOC"

bash ops/mainnet0/public-node-local-data-drop-import-stack-status-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_POINTER_V1_GREEN"
