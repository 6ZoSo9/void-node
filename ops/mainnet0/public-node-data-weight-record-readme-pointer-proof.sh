#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Data Weight Record README Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_README_POINTER_V1" README.md
grep -Fq "/public-node/data-weight-record.json" README.md
grep -Fq "docs/public/public-node-data-weight-record.md" README.md
grep -Fq "ops/mainnet0/public-node-data-weight-record-rollup-proof.sh" README.md
grep -Fq "persistent does not mean equal priority" README.md

bash ops/mainnet0/public-node-data-weight-record-rollup-proof.sh >/tmp/public-node-data-weight-record-rollup-readme-rerun.log
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROLLUP_V1_GREEN" /tmp/public-node-data-weight-record-rollup-readme-rerun.log

echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_README_POINTER_V1_GREEN"
