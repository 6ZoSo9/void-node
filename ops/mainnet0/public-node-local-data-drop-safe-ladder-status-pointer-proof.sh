#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop.md"
STATUS="docs/public/public-node-local-data-drop-live-import-safe-ladder-status.md"
SMOKE="ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh"

echo "=== VOID Public Node Local Data Drop Safe Ladder Status Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"

test -f "$DOC"
test -f "$STATUS"
test -x "$SMOKE"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LADDER_STATUS_POINTER_DOC_V1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-live-import-safe-ladder-status.md" "$DOC"
grep -Fq "run preflight" "$DOC"
grep -Fq "generate plan JSON" "$DOC"
grep -Fq "inspect expected object count" "$DOC"
grep -Fq "intentionally run live import only when ready" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_SAFE_LADDER_STATUS_V1" "$STATUS"
grep -Fq "object_count=1" "$STATUS"
grep -Fq "mutation performed: false" "$STATUS"

bash "$SMOKE"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LADDER_STATUS_POINTER_V1_GREEN"
