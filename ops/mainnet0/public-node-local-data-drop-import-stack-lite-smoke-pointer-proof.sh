#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-stack-status.md"
SMOKE="ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh"

echo "=== VOID Public Node Local Data Drop Import Stack Lite Smoke Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$SMOKE"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_DOC_V1" "$DOC"
grep -Fq "For routine checks, use the lite smoke instead of the full nested proof stack" "$DOC"
grep -Fq "avoids TypeScript builds and nested proof chains" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN" "$DOC"

bash "$SMOKE"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_V1_GREEN"
