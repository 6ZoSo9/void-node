#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [RewardEngine econ params health] ==="
echo "[cfg] prom_url = ${PROM_URL}"
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

econ_health="$(q "void_mainnet_rewardengine_econ_health")"
json_ok="$(q "void_mainnet_rewardengine_econ_json_ok")"
self_consistent="$(q "void_mainnet_rewardengine_econ_self_consistent")"
econ_5m="$(q "void:mainnet_rewardengine_econ:health:last_5m")"

echo "--- gauges ---"
echo "void_mainnet_rewardengine_econ_health          = ${econ_health}"
echo "void_mainnet_rewardengine_econ_json_ok         = ${json_ok}"
echo "void_mainnet_rewardengine_econ_self_consistent = ${self_consistent}"
echo "void:mainnet_rewardengine_econ:health:last_5m  = ${econ_5m}"
echo

echo "--- interpretation ---"
if [ "${json_ok}" = "1" ] && [ "${self_consistent}" = "1" ] && [ "${econ_health}" = "1" ]; then
  echo "OK: econ params JSON present/parseable and self-consistent."
else
  echo "WARN: something is off with econ params:"
  [ "${json_ok}" != "1" ] && echo "  - JSON not present/parseable (json_ok=${json_ok})"
  [ "${self_consistent}" != "1" ] && echo "  - triplet self-consistency failed (self_consistent=${self_consistent})"
  [ "${econ_health}" != "1" ] && echo "  - econ_health=${econ_health}"
fi

if [ "${econ_5m}" = "1" ]; then
  echo "5m view: econ pillar has been healthy over the last 5 minutes."
else
  echo "5m view: econ pillar not consistently healthy over last 5 minutes (econ_5m=${econ_5m})."
fi
