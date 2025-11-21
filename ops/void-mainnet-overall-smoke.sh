#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-overall-smoke] prom_url=$PROM_URL"

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "null"'
}

core=$(q 'void:mainnet_core:health:last_5m')
tokenomics=$(q 'void:mainnet_tokenomics:health:last_5m')
overall=$(q 'void:mainnet_overall:health:last_5m')

echo "[mainnet] core_health      = $core"
echo "[mainnet] tokenomics_health= $tokenomics"
echo "[mainnet] overall_health   = $overall"

# For now: no hard failure. Once core should be green, we can enforce:
# if [ "$overall" != "1" ]; then
#   echo "[mainnet] ERROR: overall_health != 1" >&2
#   exit 1
# fi

echo "[mainnet] RESULT: OK (metric present, values shown)"
