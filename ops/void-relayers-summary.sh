#!/usr/bin/env bash
set -euo pipefail

# VOID Work Credits — Relayer metrics summary (dev)
#
# Reads Prometheus for relayer metrics and prints a human summary.
# This is the relayer analogue of void-work-credits-summary.sh.
#
# Usage:
#   ./ops/void-relayers-summary.sh
#
# Env:
#   PROM_URL (default: http://127.0.0.1:9090)

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [relayers-summary] VOID relayers summary ==="
echo "[cfg] PROM_URL = ${PROM_URL}"
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result'
}

echo "--- configured relayers ---"
res_configured="$(q 'void_relayers_configured_total')"

if [[ "${res_configured}" == "[]" ]]; then
  echo "void_relayers_configured_total: (no series)"
else
  echo "${res_configured}" | jq -r '.[] | "configured_total=\(.value[1])"'
fi

echo
echo "--- per-relayer VOID balances (stub v1) ---"
res_bal="$(q 'void_relayers_void_balance')"
if [[ "${res_bal}" == "[]" ]]; then
  echo "(no relayer balance metrics present)"
else
  echo "${res_bal}" | jq -r '.[] | "relayer=\(.metric.relayer) void_balance=\(.value[1])"'
fi

echo
echo "--- per-relayer gas / recovery / WC totals (stub v1) ---"

res_spent="$(q 'void_relayers_void_spent_gas_total')"
if [[ "${res_spent}" == "[]" ]]; then
  echo "(no void_spent_gas_total metrics present)"
else
  echo "${res_spent}" | jq -r '.[] | "relayer=\(.metric.relayer) void_spent_gas_total=\(.value[1])"'
fi

res_recv="$(q 'void_relayers_void_recovered_total')"
if [[ "${res_recv}" == "[]" ]]; then
  echo "(no void_recovered_total metrics present)"
else
  echo "${res_recv}" | jq -r '.[] | "relayer=\(.metric.relayer) void_recovered_total=\(.value[1])"'
fi

res_wc="$(q 'void_relayers_wc_collected_total')"
if [[ "${res_wc}" == "[]" ]]; then
  echo "(no wc_collected_total metrics present)"
else
  echo "${res_wc}" | jq -r '.[] | "relayer=\(.metric.relayer) wc_collected_total=\(.value[1])"'
fi

echo
echo "=== [relayers-summary] done ==="
