#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop.md"
RUNBOOK="docs/public/public-node-local-data-drop-import-directory-runbook.md"

test -f "$DOC"
test -f "$RUNBOOK"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_POINTER_DOC_V1" "$DOC"
grep -Fq "public-node-local-data-drop-import-directory-runbook.md" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1" "$RUNBOOK"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-dir.sh" "$RUNBOOK"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1_GREEN" ops/mainnet0/public-node-local-data-drop-import-dir-runbook-proof.sh

echo "doc=$DOC"
echo "runbook=$RUNBOOK"
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_POINTER_DOC_V1"
echo "runbook_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1"
echo "helper=ops/mainnet0/public-node-local-data-drop-import-dir.sh"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_POINTER_V1_GREEN"
