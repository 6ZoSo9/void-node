#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[plan-prom-health] prom_url=${PROM_URL}"

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${expr}"
}

extract_value() {
  jq -r '
    if .status != "success" then
      "ERR"
    elif (.data.result | length) == 0 then
      "NA"
    else
      .data.result[0].value[1]
    end
  '
}

echo
echo "[plan-prom-health] checking plan recordings..."

CFG_RAW="$(q "void:mainnet_bootstrap_plan:configured:last_5m" | extract_value || echo "ERR")"
HEALTH_RAW="$(q "void:mainnet_bootstrap_plan:health:last_5m" | extract_value || echo "ERR")"

echo "  void:mainnet_bootstrap_plan:configured:last_5m = ${CFG_RAW}"
echo "  void:mainnet_bootstrap_plan:health:last_5m     = ${HEALTH_RAW}"

CFG_OK=0
HEALTH_OK=0

if [[ "${CFG_RAW}" == "1" ]]; then
  CFG_OK=1
fi

if [[ "${HEALTH_RAW}" == "1" ]]; then
  HEALTH_OK=1
fi

echo
echo "[plan-prom-health] summary:"
echo "  CONFIG_OK = ${CFG_OK}"
echo "  HEALTH_OK = ${HEALTH_OK}"

if [[ "${CFG_RAW}" == "NA" || "${CFG_RAW}" == "ERR" ]]; then
  echo "[plan-prom-health] RESULT: NO DATA (recordings not present or Prom error)."
  exit 0
fi

if [[ "${CFG_OK}" -eq 1 && "${HEALTH_OK}" -eq 1 ]]; then
  echo "[plan-prom-health] RESULT: PLAN READY (Prometheus view)."
elif [[ "${CFG_OK}" -eq 1 && "${HEALTH_OK}" -eq 0 ]]; then
  echo "[plan-prom-health] RESULT: CONFIGURED BUT NOT READY (Prometheus view, matches alert)."
else
  echo "[plan-prom-health] RESULT: NOT CONFIGURED (config/recordings not sane yet)."
fi
