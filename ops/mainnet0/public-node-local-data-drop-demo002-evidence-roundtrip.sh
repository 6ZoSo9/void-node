#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo002-evidence-roundtrip-$STAMP}"

SMOKE="ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh"
IMPORT="ops/mainnet0/public-node-local-data-drop-demo002-import-smoke-receipt.sh"
STATUS="ops/mainnet0/public-node-local-data-drop-demo002-receipt-intake-status.sh"

mkdir -p "$OUT"

echo "=== VOID Public Node Demo 002 Evidence Roundtrip v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1"
echo "base=$BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"

test -x "$SMOKE"
test -x "$VERIFY"
test -x "$IMPORT"
test -x "$STATUS"

PUBLIC_NODE_BASE="$BASE" OUT="$OUT/smoke" "$SMOKE" | tee "$OUT/smoke.log"

RECEIPT="$(grep '^receipt=' "$OUT/smoke.log" | tail -n 1 | cut -d= -f2-)"
test -f "$RECEIPT"

"$VERIFY" "$RECEIPT" | tee "$OUT/verify.log"

DATA_DIR="$DATA_DIR" "$IMPORT" "$RECEIPT" | tee "$OUT/import.log"

DATA_DIR="$DATA_DIR" "$STATUS" | tee "$OUT/status.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN" "$OUT/smoke.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN" "$OUT/verify.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1_IMPORTED" "$OUT/import.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$OUT/status.log"

echo "receipt=$RECEIPT"
echo "smoke_log=$OUT/smoke.log"
echo "verify_log=$OUT/verify.log"
echo "import_log=$OUT/import.log"
echo "status_log=$OUT/status.log"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN"
