#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[plan-health] prom_url=${PROM_URL}"

QUERY='void:mainnet_bootstrap_plan:health:last_5m'

echo
echo "[plan-health] checking PLAN structural health (last 5m)..."

RAW_JSON="$(
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${QUERY}" \
    || echo '{"status":"error","data":{"result":[]}}'
)"

STATUS="$(echo "${RAW_JSON}" | jq -r '.status // "error"' 2>/dev/null || echo "error")"

if [ "${STATUS}" != "success" ]; then
  echo "[plan-health] ERROR: Prometheus query failed (status=${STATUS})"
  echo "${RAW_JSON}"
  exit 1
fi

RESULT_COUNT="$(echo "${RAW_JSON}" | jq -r '.data.result | length' 2>/dev/null || echo "0")"

if [ "${RESULT_COUNT}" -eq 0 ]; then
  echo "[plan-health] WARN: no time series for ${QUERY} (metric missing?)"
  exit 1
fi

VALUE_STR="$(echo "${RAW_JSON}" | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")"

echo "[plan-health]   ${QUERY} = ${VALUE_STR}"

EXIT_CODE=1

case "${VALUE_STR}" in
  1|1.0)
    echo
    echo "[plan-health] RESULT: OK (bootstrap PLAN is structurally READY-ish in live.json)"
    EXIT_CODE=0
    ;;
  0|0.0)
    echo
    echo "[plan-health] RESULT: NOT_READY (bootstrap PLAN missing critical fields)"
    echo "  - This is EXPECTED until you fill in real mainnet roles, contracts, and validator0."
    EXIT_CODE=1
    ;;
  *)
    echo
    echo "[plan-health] RESULT: UNKNOWN (non-binary value: ${VALUE_STR})"
    EXIT_CODE=1
    ;;
esac

echo
echo "[plan-health] hint: for details, run:"
echo "  ./ops/void-mainnet-bootstrap-plan-view.sh"

exit "${EXIT_CODE}"
