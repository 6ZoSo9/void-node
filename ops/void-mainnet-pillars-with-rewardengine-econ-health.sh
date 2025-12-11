#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet pillars + validators + RewardEngine econ health] ==="
echo "[cfg] prom_url = ${PROM_URL}"
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

pillars_validators_5m="$(q 'void:mainnet_pillars_with_validators:health:last_5m')"
econ_5m="$(q 'void:mainnet_rewardengine_econ:health:last_5m')"
combo_5m="$(q 'void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m')"

echo "--- gauges ---"
echo "void:mainnet_pillars_with_validators:health:last_5m                    = ${pillars_validators_5m}"
echo "void:mainnet_rewardengine_econ:health:last_5m                          = ${econ_5m}"
echo "void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m  = ${combo_5m}"
echo

echo "--- interpretation ---"
if [ "${pillars_validators_5m}" = "1" ] && [ "${econ_5m}" = "1" ] && [ "${combo_5m}" = "1" ]; then
  echo "OK: mainnet pillars + validators + RewardEngine econ have all been healthy over the last 5 minutes."
else
  echo "WARN: something is off:"
  [ "${pillars_validators_5m}" != "1" ] && echo "  - pillars+validators 5m health != 1 (=${pillars_validators_5m})"
  [ "${econ_5m}" != "1" ] && echo "  - RewardEngine econ 5m health != 1 (=${econ_5m})"
  [ "${combo_5m}" != "1" ] && echo "  - combined pillars+validators+econ 5m health != 1 (=${combo_5m})"
fi
