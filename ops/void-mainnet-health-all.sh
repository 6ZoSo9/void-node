#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"'
}

echo "[mainnet-health-all] step 1: core health (recording rule)..."
core="$(q 'void:mainnet_core:health:last_5m')"
echo "  void:mainnet_core:health:last_5m = ${core}"

echo
echo "[mainnet-health-all] step 2: tokenomics health (recording rule)..."
tok="$(q 'void:mainnet_tokenomics:health:last_5m')"
echo "  void:mainnet_tokenomics:health:last_5m = ${tok}"

echo
echo "[mainnet-health-all] step 3: overall health (recording rule)..."
overall="$(q 'void:mainnet_overall:health:last_5m')"
echo "  void:mainnet_overall:health:last_5m = ${overall}"

echo
echo "[mainnet-health-all] RESULT:"
if [[ "${core}" == "1" && "${tok}" == "1" && "${overall}" == "1" ]]; then
  echo "  OK (core==1, tokenomics==1, overall==1 over last 5m)"
  exit 0
fi

echo "  BAD:"
echo "    core:      ${core}"
echo "    tokenomics:${tok}"
echo "    overall:   ${overall}"
echo
echo "  At least one mainnet health gauge is not 1. Check Prometheus / Grafana."
exit 1
