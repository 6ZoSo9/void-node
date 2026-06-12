#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-demo-001-status.md"
SCRIPT="ops/mainnet0/public-node-local-data-drop-live-import-target-plan.sh"

echo "=== VOID Public Node Local Data Drop Live Import Target Plan Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_POINTER_V1" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-target-plan.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1_READY" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_FINAL_GREEN" "$DOC"
grep -Fq "no-mutation target plan" "$DOC"
grep -Fq "prints the exact import command targeting the live route DATA_DIR" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1" "$SCRIPT"
grep -Fq "no_mutation=true" "$SCRIPT"
grep -Fq "planned_import_command=DATA_DIR=" "$SCRIPT"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_POINTER_V1_GREEN"
