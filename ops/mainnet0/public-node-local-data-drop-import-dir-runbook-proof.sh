#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-directory-runbook.md"

test -f "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-dir.sh" "$DOC"
grep -Fq "/public-node/local-data-drop.json" "$DOC"
grep -Fq "/public-node/local-data-drop/manifest.json" "$DOC"
grep -Fq "/public-node/local-data-drop/by-sha256/:sha256" "$DOC"
grep -Fq "public upload: false" "$DOC"
grep -Fq "operator local import only: true" "$DOC"
grep -Fq "public read only: true" "$DOC"
grep -Fq "trusted as network truth: false" "$DOC"

echo "doc=$DOC"
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1"
echo "helper=ops/mainnet0/public-node-local-data-drop-import-dir.sh"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1_GREEN"
