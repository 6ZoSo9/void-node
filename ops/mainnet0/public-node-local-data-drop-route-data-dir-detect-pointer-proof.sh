#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-demo-001-status.md"
SCRIPT="ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh"

echo "=== VOID Public Node Local Data Drop Route DATA_DIR Detect Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_POINTER_V1" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1_READY" "$DOC"
grep -Fq "/home/zoso/dev/void-node/data_a" "$DOC"
grep -Fq ".runtime/mainnet0" "$DOC"
grep -Fq "live public route is reading \`data_a\`" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1" "$SCRIPT"
grep -Fq "no_mutation=true" "$SCRIPT"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_POINTER_V1_GREEN"
