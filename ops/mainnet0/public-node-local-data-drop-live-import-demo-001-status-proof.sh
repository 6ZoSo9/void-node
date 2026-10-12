#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-demo-001-status.md"

echo "=== VOID Public Node Local Data Drop Live Import Demo 001 Status Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"

test -f "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_V1" "$DOC"
grep -Fq "live weighted route object count: \`2\`" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "/home/zoso/dev/void-node/data_a" "$DOC"
grep -Fq ".runtime/mainnet0" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_FINAL_GREEN" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-live-import-demo-001-green-20260612-161431" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "cross-box pending" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-live-import-demo-001-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_V1_GREEN"
