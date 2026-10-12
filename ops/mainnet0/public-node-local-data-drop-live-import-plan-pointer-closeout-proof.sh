#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-plan-pointer-closeout.md"
PROOF="ops/mainnet0/public-node-local-data-drop-live-import-plan-pointer-proof.sh"

echo "=== VOID Public Node Local Data Drop Live Import Plan Pointer Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"

test -f "$DOC"
test -x "$PROOF"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_POINTER_CLOSEOUT_V1" "$DOC"
grep -Fq "safe no-mutation ladder" "$DOC"
grep -Fq "run preflight" "$DOC"
grep -Fq "generate plan JSON" "$DOC"
grep -Fq "inspect expected object count" "$DOC"
grep -Fq "intentionally run live import only when ready" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_POINTER_DOC_V1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1_READY" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_POINTER_V1_GREEN" "$DOC"
grep -Fq "213891a5" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-live-import-plan-pointer-green-20260612-152933" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "mutation performed: false" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

bash "$PROOF"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_POINTER_CLOSEOUT_V1_GREEN"
