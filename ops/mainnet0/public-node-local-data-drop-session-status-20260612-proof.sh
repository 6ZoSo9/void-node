#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-session-status-20260612.md"
SMOKE="ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh"

echo "=== VOID Public Node Local Data Drop Session Status 20260612 Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"

test -f "$DOC"
test -x "$SMOKE"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SESSION_STATUS_20260612_V1" "$DOC"
grep -Fq "af364df6" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-safe-ladder-status-pointer-closeout-green-20260612-154618" "$DOC"
grep -Fq "discoverable safe live-import ladder" "$DOC"
grep -Fq "top-level Local Data Drop doc" "$DOC"
grep -Fq "safe ladder status doc" "$DOC"
grep -Fq "preflight tool" "$DOC"
grep -Fq "plan JSON artifact" "$DOC"
grep -Fq "lite no-build routine smoke" "$DOC"
grep -Fq "intentional live import only when ready" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "mutation performed: false" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN" "$DOC"

bash "$SMOKE"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SESSION_STATUS_20260612_V1_GREEN"
