#!/usr/bin/env bash
set -euo pipefail

STATUS="ops/mainnet0/public-node-local-data-drop-demo002-receipt-intake-status.sh"
IMPORT="ops/mainnet0/public-node-local-data-drop-demo002-import-smoke-receipt.sh"
SMOKE="ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-receipt-intake-status-proof-$STAMP"

mkdir -p "$OUT/data"

echo "=== VOID Public Node Demo 002 Receipt Intake Status Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$STATUS"
test -x "$IMPORT"
test -x "$SMOKE"
bash -n "$STATUS"
bash -n "$IMPORT"
bash -n "$SMOKE"

DATA_DIR="$OUT/empty" "$STATUS" | tee "$OUT/status-empty.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_EMPTY" "$OUT/status-empty.log"
grep -q "latest_present=false" "$OUT/status-empty.log"

PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" OUT="$OUT/smoke-run" "$SMOKE" | tee "$OUT/smoke.log"
RECEIPT="$(grep '^receipt=' "$OUT/smoke.log" | tail -n 1 | cut -d= -f2-)"
test -f "$RECEIPT"

DATA_DIR="$OUT/data" "$IMPORT" "$RECEIPT" | tee "$OUT/import.log"
DATA_DIR="$OUT/data" "$STATUS" | tee "$OUT/status-green.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$OUT/status-green.log"
grep -q "status=demo002_receipt_intake_present" "$OUT/status-green.log"
grep -q "latest_present=true" "$OUT/status-green.log"
grep -q "archive_count=1" "$OUT/status-green.log"
grep -q "offline_verified=true" "$OUT/status-green.log"
grep -q "network_fetch_during_import=false" "$OUT/status-green.log"
grep -q "trusted_as_network_truth=false" "$OUT/status-green.log"
grep -q "$SHA" "$OUT/status-green.log"

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "empty_status_verified=true"
echo "green_status_verified=true"
echo "archive_count_verified=true"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_PROOF_V1_GREEN"
