#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

jq_val() {
  local query="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${query}" \
  | jq -r 'if .data.result | length == 0 then "null" else .data.result[0].value[1] end'
}

echo "[mainnet-core smoke] PROM_URL=${PROM_URL}"

health_raw="$(jq_val 'void_mainnet_core_health')"
safeboot_overall="$(jq_val 'void_mainnet_core_safeboot_overall')"
devnet_overall="$(jq_val 'void_mainnet_core_devnet_overall')"
manifest_health="$(jq_val 'void_mainnet_core_manifest_health')"
manifest_days="$(jq_val 'void_mainnet_core_manifest_days_left')"

health_5m="$(jq_val 'void:mainnet_core:health:last_5m')"
manifest_days_last="$(jq_val 'void:mainnet_core:manifest_days_left:last')"

echo
echo "[raw gauges]"
echo "  void_mainnet_core_health              = ${health_raw}"
echo "  void_mainnet_core_safeboot_overall    = ${safeboot_overall}"
echo "  void_mainnet_core_devnet_overall      = ${devnet_overall}"
echo "  void_mainnet_core_manifest_health     = ${manifest_health}"
echo "  void_mainnet_core_manifest_days_left  = ${manifest_days}"

echo
echo "[recordings]"
echo "  void:mainnet_core:health:last_5m             = ${health_5m}"
echo "  void:mainnet_core:manifest_days_left:last    = ${manifest_days_last}"

echo
echo "[interpretation]"
if [[ "${health_5m}" == "1" ]]; then
  echo "  → mainnet-core READY (health==1 over last 5m)."
else
  echo "  → mainnet-core NOT READY (health!=1; at least one gate is red)."
fi

echo
echo "  Gates:"
echo "    - safeboot_overall: ${safeboot_overall}"
echo "    - devnet_overall (5m-smoothed): ${devnet_overall}"
echo "    - manifest_health: ${manifest_health}"
echo "    - manifest_days_left: ${manifest_days_last}"
