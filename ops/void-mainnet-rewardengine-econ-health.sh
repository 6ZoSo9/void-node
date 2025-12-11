#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [RewardEngine econ params health] ==="
echo "[cfg] prom_url = ${PROM_URL}"
echo

q() {
  local metric="$1"
  local raw
  raw="$(curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${metric}" 2>/dev/null || echo "")"

  if [ -z "$raw" ]; then
    echo "NaN"
    return
  fi

  echo "$raw" | jq -r '
    if .status == "success"
       and (.data.result | length) > 0
       and (.data.result[0].value | length) > 1
    then .data.result[0].value[1]
    else "NaN"
    end
  ' 2>/dev/null || echo "NaN"
}

econ_health="$(q "void_mainnet_rewardengine_econ_health")"
json_ok="$(q "void_mainnet_rewardengine_econ_json_ok")"
self_consistent="$(q "void_mainnet_rewardengine_econ_self_consistent")"

echo "--- gauges ---"
echo "void_mainnet_rewardengine_econ_health          = ${econ_health}"
echo "void_mainnet_rewardengine_econ_json_ok         = ${json_ok}"
echo "void_mainnet_rewardengine_econ_self_consistent = ${self_consistent}"
echo

echo "--- interpretation ---"
if [ "${econ_health}" = "1" ] && [ "${json_ok}" = "1" ]; then
  if [ "${self_consistent}" = "0" ]; then
    echo "WARN: JSON parses but self-consistency check failed (triplet present & mismatch)."
  else
    echo "OK: econ params JSON present/parseable; self-consistency is OK or not enforced."
  fi
else
  echo "BAD: econ health is not green; check params JSON and exporter."
fi
