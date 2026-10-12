#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop.md"
STATUS="docs/public/public-node-local-data-drop-live-import-demo-001-status.md"

echo "=== VOID Public Node Local Data Drop Live Import Demo 001 Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -f "$STATUS"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_POINTER_V1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-live-import-demo-001-status.md" "$DOC"
grep -Fq "live-import-demo-001.txt" "$DOC"
grep -Fq "live weighted route object count: \`2\`" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_FINAL_GREEN" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_V1" "$STATUS"
grep -Fq "live weighted route object count: \`2\`" "$STATUS"
grep -Fq "/home/zoso/dev/void-node/data_a" "$STATUS"
grep -Fq "cross-box pending" "$STATUS"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_POINTER_V1_GREEN"
