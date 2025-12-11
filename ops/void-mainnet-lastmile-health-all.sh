#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

echo "[mainnet-lastmile-health] PROM_URL=${PROM_URL}"
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

health_5m="$(q 'void:mainnet_lastmile:health:last_5m')"
gap="$(q 'void:mainnet_lastmile:last_nonempty_gap')"

echo "  void:mainnet_lastmile:health:last_5m    = ${health_5m}"
echo "  void:mainnet_lastmile:last_nonempty_gap = ${gap}"
echo

if [ "${health_5m}" != "1" ]; then
  echo "[mainnet-lastmile-health] ERROR: lastmile 5m health != 1 (=${health_5m})"
  echo "[mainnet-lastmile-health] HINT: check seals/txqueue metrics and last non-empty block."
  exit 1
fi

echo "[mainnet-lastmile-health] DONE"
