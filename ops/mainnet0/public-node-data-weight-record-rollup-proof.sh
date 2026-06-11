#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Data Weight Record Rollup Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

bash ops/mainnet0/public-node-data-weight-record-source-proof.sh >/tmp/public-node-data-weight-record-source-proof-rollup.log
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_SOURCE_PROOF_V1_GREEN" /tmp/public-node-data-weight-record-source-proof-rollup.log

bash ops/mainnet0/public-node-data-weight-record-pointer-proof.sh >/tmp/public-node-data-weight-record-pointer-proof-rollup.log
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_V1_GREEN" /tmp/public-node-data-weight-record-pointer-proof-rollup.log

bash ops/mainnet0/public-node-route-manifest-data-weight-pointer-proof.sh >/tmp/public-node-route-manifest-data-weight-pointer-proof-rollup.log
grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_DATA_WEIGHT_POINTER_V1_GREEN" /tmp/public-node-route-manifest-data-weight-pointer-proof-rollup.log

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_DOC_V1" docs/public/public-node-data-weight-record.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_FIXTURE_V1" fixtures/public-node/data-weight-record-v1.json
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_DOC_V1" docs/public/public-node-local-data-drop.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_DOC_V1" docs/public/public-node-local-data-drop-import-directory-runbook.md
grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_DATA_WEIGHT_RECORD_POINTER_V1" docs/public/public-node-route-manifest.md

echo "source_proof_green=true"
echo "local_data_drop_pointer_green=true"
echo "route_manifest_pointer_green=true"
echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROLLUP_V1_GREEN"
