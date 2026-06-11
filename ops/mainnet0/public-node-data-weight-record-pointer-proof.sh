#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Data Weight Record Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_DOC_V1" docs/public/public-node-local-data-drop.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_DOC_V1" docs/public/public-node-local-data-drop-import-directory-runbook.md

grep -Fq "/public-node/data-weight-record.json" docs/public/public-node-local-data-drop.md
grep -Fq "/public-node/data-weight-record.json" docs/public/public-node-local-data-drop-import-directory-runbook.md

grep -Fq "persistent does not mean equal priority" docs/public/public-node-local-data-drop.md
grep -Fq "persistent does not mean equal priority" docs/public/public-node-local-data-drop-import-directory-runbook.md

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_SOURCE_PROOF_V1_GREEN" ops/mainnet0/public-node-data-weight-record-source-proof.sh
bash ops/mainnet0/public-node-data-weight-record-source-proof.sh >/tmp/public-node-data-weight-record-source-proof-rerun.log
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_SOURCE_PROOF_V1_GREEN" /tmp/public-node-data-weight-record-source-proof-rerun.log

echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_V1_GREEN"
