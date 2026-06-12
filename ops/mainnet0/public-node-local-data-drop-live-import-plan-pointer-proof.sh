#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-runbook.md"
PLAN_PROOF="ops/mainnet0/public-node-local-data-drop-live-import-plan-proof.sh"

echo "=== VOID Public Node Local Data Drop Live Import Plan Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"

test -f "$DOC"
test -x "$PLAN_PROOF"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_POINTER_DOC_V1" "$DOC"
grep -Fq "After preflight and before live import" "$DOC"
grep -Fq "generate a no-mutation JSON plan artifact" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-plan.sh /path/to/source-dir" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1_READY" "$DOC"
grep -Fq "current live object count" "$DOC"
grep -Fq "expected object count after import" "$DOC"
grep -Fq "recommended live import command" "$DOC"
grep -Fq "This does not run the import" "$DOC"
grep -Fq "run preflight" "$DOC"
grep -Fq "generate plan JSON" "$DOC"
grep -Fq "inspect expected object count" "$DOC"
grep -Fq "intentionally run live import only when ready" "$DOC"

bash "$PLAN_PROOF"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_POINTER_V1_GREEN"
