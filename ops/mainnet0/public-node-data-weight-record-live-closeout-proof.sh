#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== VOID Public Node Data Weight Record Live Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_LIVE_PROOF_CLOSEOUT_UPDATE_V1" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "ckpt-public-node-data-weight-record-live-proof-green-20260611-234858" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1_GREEN" docs/public/public-node-data-weight-record-closeout.md
grep -Fq "live-proof green" docs/public/public-node-data-weight-record-closeout.md

echo "VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_LIVE_CLOSEOUT_V1_GREEN"
