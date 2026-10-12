#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-safe-ladder-status.md"
LITE="ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh"
PLAN_PROOF="ops/mainnet0/public-node-local-data-drop-live-import-plan-pointer-closeout-proof.sh"

echo "=== VOID Public Node Local Data Drop Live Import Safe Ladder Status Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"

test -f "$DOC"
test -x "$LITE"
test -x "$PLAN_PROOF"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_SAFE_LADDER_STATUS_V1" "$DOC"
grep -Fq "Precision-green and no-mutation proven" "$DOC"
grep -Fq "run preflight" "$DOC"
grep -Fq "generate plan JSON" "$DOC"
grep -Fq "inspect expected object count" "$DOC"
grep -Fq "intentionally run live import only when ready" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_READY" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PLAN_V1_READY" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN" "$DOC"
grep -Fq "1f19fc4c" "$DOC"
grep -Fq "6013db20" "$DOC"
grep -Fq "15e4ef15" "$DOC"
grep -Fq "ecc1bb68" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "mutation performed: false" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

bash "$LITE"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_SAFE_LADDER_STATUS_V1_GREEN"
