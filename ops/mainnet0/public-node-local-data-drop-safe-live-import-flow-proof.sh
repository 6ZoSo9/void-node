#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-safe-live-import-flow.md"
DETECT="ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh"
PLAN="ops/mainnet0/public-node-local-data-drop-live-import-target-plan.sh"
IMPORT="ops/mainnet0/public-node-local-data-drop-import-dir.sh"

echo "=== VOID Public Node Local Data Drop Safe Live Import Flow Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$DETECT"
test -x "$PLAN"
test -x "$IMPORT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LIVE_IMPORT_FLOW_V1" "$DOC"
grep -Fq "Detect the running public node DATA_DIR" "$DOC"
grep -Fq "Generate a no-mutation live import target plan" "$DOC"
grep -Fq "Run the import against the detected live DATA_DIR" "$DOC"
grep -Fq "Verify \`/public-node/local-data-drop/weighted.json\`" "$DOC"

grep -Fq "ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-target-plan.sh" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-dir.sh" "$DOC"
grep -Fq "http://127.0.0.1:4100/public-node/local-data-drop/weighted.json" "$DOC"

grep -Fq "/home/zoso/dev/void-node/data_a" "$DOC"
grep -Fq "current live weighted route object count after demo 001: \`2\`" "$DOC"
grep -Fq "live-import-demo-001.txt" "$DOC"
grep -Fq "void-weighted-seed-v1.txt" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1_READY" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1_READY" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_FINAL_GREEN" "$DOC"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LIVE_IMPORT_FLOW_V1_GREEN"
