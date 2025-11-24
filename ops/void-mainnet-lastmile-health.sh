#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q_scalar() {
  local label="$1"
  local expr="$2"
  local val
  val=$(curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")
  printf "  %-40s = %s\n" "${label}" "${val}"
}

echo "[mainnet-lastmile-health] PROM_URL=${PROM_URL}"
echo

q_scalar "void:mainnet_lastmile:health:last_5m"   'void:mainnet_lastmile:health:last_5m'
q_scalar "void:mainnet_lastmile:last_nonempty_gap" 'void:mainnet_lastmile:last_nonempty_gap'

echo
echo "[mainnet-lastmile-health] DONE"
