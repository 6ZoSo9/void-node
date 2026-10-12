#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
URL="$BASE/__void/metrics/datanet_receipts_fetch_native_v1.prom"
OUT="$(curl -fsS --max-time 2 "$URL" 2>/dev/null || true)"
if echo "$OUT" | grep -q '^void_datanet_fetch_receipts_native_v1_mounted 1'; then
  echo "[ok] native_fetch_receipts mounted=1"
  exit 0
fi
echo "[FAIL] native_fetch_receipts not mounted=1"
echo "$OUT" | head -n 40 || true
exit 2
