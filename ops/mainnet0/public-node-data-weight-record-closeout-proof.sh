#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Data Weight Record Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_CLOSEOUT_DOC_V1" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROLLUP_V1_GREEN" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_README_POINTER_V1_GREEN" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "Persistent does not mean equal priority" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "Live server proof remains pending" docs/public/public-node-data-weight-record-closeout.md

bash ops/mainnet0/public-node-data-weight-record-rollup-proof.sh >/tmp/public-node-data-weight-record-closeout-rollup.log
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_ROLLUP_V1_GREEN" /tmp/public-node-data-weight-record-closeout-rollup.log

bash ops/mainnet0/public-node-data-weight-record-readme-pointer-proof.sh >/tmp/public-node-data-weight-record-closeout-readme.log
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_README_POINTER_V1_GREEN" /tmp/public-node-data-weight-record-closeout-readme.log

echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_CLOSEOUT_V1_GREEN"
