#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-run prom-diag] VOID mainnet RUN metrics via Prometheus ==="
echo "PROM_URL = ${PROM_URL}"
echo

echo "--- [1] raw void_mainnet_run_state ---"
curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_run_state" | jq '.data.result'
echo

echo "--- [2] raw void_mainnet_run_status ---"
curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_run_status" | jq '.data.result'
echo

echo "--- [3] quick interpretation ---"
STATE_JSON="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_run_state" | jq -r '.data.result[0].metric.status // empty' || true)"
STATUS_NUM="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_run_status" | jq -r '.data.result[0].value[1] // empty' || true)"

echo "state.status (label)  = ${STATE_JSON:-<none>}"
echo "status numeric (gauge)= ${STATUS_NUM:-<none>}"

case "${STATUS_NUM:-UNKNOWN}" in
  0)
    echo "INTERPRETATION: RUN is NOT_STARTED (planning-only, as expected)."
    ;;
  1)
    echo "INTERPRETATION: RUN appears IN_PROGRESS (unexpected in stub world!)."
    ;;
  2)
    echo "INTERPRETATION: RUN appears COMPLETED (would only be true after real bootstrap)."
    ;;
  -1)
    echo "INTERPRETATION: RUN appears FAILED (we would investigate before any retry)."
    ;;
  -2|UNKNOWN|*)
    echo "INTERPRETATION: RUN status is UNKNOWN or missing; check exporter + textfile."
    ;;
esac

echo
echo "NOTE: In the current stub-only phase we EXPECT status=NOT_STARTED and numeric=0."
echo "      hash_match=\"UNKNOWN\" from node_exporter is also expected for now."
echo "=== [mainnet-run prom-diag] done ==="
