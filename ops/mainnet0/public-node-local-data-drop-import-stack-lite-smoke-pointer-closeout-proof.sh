#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-stack-lite-smoke-pointer-closeout.md"
POINTER_PROOF="ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke-pointer-proof.sh"

echo "=== VOID Public Node Local Data Drop Import Stack Lite Smoke Pointer Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$POINTER_PROOF"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_CLOSEOUT_V1" "$DOC"
grep -Fq "routine operators to the lite smoke checker" "$DOC"
grep -Fq "avoids the long nested proof chain" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke-pointer-proof.sh" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_V1_GREEN" "$DOC"
grep -Fq "89306548" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-stack-lite-smoke-pointer-green-20260612-151802" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

bash "$POINTER_PROOF"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_POINTER_CLOSEOUT_V1_GREEN"
