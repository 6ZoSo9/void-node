#!/usr/bin/env bash
set -euo pipefail

# --- E2E_AUTO_PICK_V1: choose JOBID/RID if not exported ---
SAMPLE_ENV="${SAMPLE_ENV:-docs/VOID-DEVNET-RECEIPT-SAMPLE.env}"
SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

if [ -z "${JOBID:-}" ] || [[ "${JOBID:-}" =~ ^0x0+$ ]]; then
  if [ -f "$SAMPLE_ENV" ]; then
    # shellcheck disable=SC1090
    source "$SAMPLE_ENV" || true
  fi
fi

if [ -z "${JOBID:-}" ] || [[ "${JOBID:-}" =~ ^0x0+$ ]] || [ -z "${RID:-}" ] || [[ "${RID:-}" =~ ^0x0+$ ]]; then
  if [ -f "$SPOOL" ]; then
    line="$(tail -n 1 "$SPOOL" 2>/dev/null || true)"
    # expected (tsv-ish): <ts>\t<jobid>\t<rid>\t...
    job="$(printf "%s" "$line" | awk -F'\t' '{print $2}' | tr -d '[:space:]')"
    rid="$(printf "%s" "$line" | awk -F'\t' '{print $3}' | tr -d '[:space:]')"
    if [ -z "${JOBID:-}" ] || [[ "${JOBID:-}" =~ ^0x0+$ ]]; then JOBID="$job"; fi
    if [ -z "${RID:-}" ] || [[ "${RID:-}" =~ ^0x0+$ ]]; then RID="$rid"; fi
  fi
fi
# --- end E2E_AUTO_PICK_V1 ---


BASE_PROM="${BASE_PROM:-http://127.0.0.1:9100/metrics}"

echo "=== [run] receipts e2e exporter ==="
# --- E2E_EXPORT_BEFORE_CALL_V1 ---
echo "[e2e-gate] SAMPLE_ENV=${SAMPLE_ENV:-docs/VOID-DEVNET-RECEIPT-SAMPLE.env} SPOOL=${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"
echo "[e2e-gate] picked JOBID=${JOBID:-<empty>} RID=${RID:-<empty>}"
export JOBID RID
# --- end E2E_EXPORT_BEFORE_CALL_V1 ---
./ops/void-devnet-receipts-e2e-exporter.sh

echo
echo "=== [check] node_exporter metric void_devnet_receipts_e2e_ok ==="
val="$(curl -fsS "$BASE_PROM" | awk '/^void_devnet_receipts_e2e_ok[[:space:]]+/{print $2; exit}')"
echo "void_devnet_receipts_e2e_ok=${val:-<missing>}"

if [ "${val:-}" != "1" ]; then
  echo "[ERR] receipts e2e not OK (expected 1)"
  exit 3
fi

echo "[OK] receipts e2e gate passed"
