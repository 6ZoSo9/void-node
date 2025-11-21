#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-core-health] repo=$(pwd)"
echo "[mainnet-core-health] prom_url=$PROM_URL"

get_scalar() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null \
    || echo "null"
}

echo "[mainnet-core-health] querying pillar gauges..."

safeboot_overall="$(get_scalar 'void:safeboot:overall')"
core_health="$(get_scalar 'void_mainnet_core_health')"
core_health_5m="$(get_scalar 'void:mainnet_core:health:last_5m')"
manifest_health="$(get_scalar 'void_mainnet_core_manifest_health')"
manifest_days="$(get_scalar 'void_mainnet_core_manifest_days')"

echo "[mainnet-core-health] safeboot_overall                 = ${safeboot_overall}"
echo "[mainnet-core-health] void_mainnet_core_health         = ${core_health}"
echo "[mainnet-core-health] void:mainnet_core:health:last_5m = ${core_health_5m}"
echo "[mainnet-core-health] void_mainnet_core_manifest_health= ${manifest_health}"
echo "[mainnet-core-health] void_mainnet_core_manifest_days  = ${manifest_days}"

err=0

# Basic null / presence checks
for name in safeboot_overall core_health core_health_5m manifest_health manifest_days; do
  val="${!name}"
  if [[ "$val" == "null" ]]; then
    echo "[mainnet-core-health] ERROR: metric ${name} is null/missing from Prometheus"
    err=1
  fi
done

# Only do deeper checks if we actually got values
if [[ "$core_health" != "1" ]]; then
  echo "[mainnet-core-health] ERROR: void_mainnet_core_health != 1 (got ${core_health})"
  err=1
fi

if [[ "$core_health_5m" != "1" ]]; then
  echo "[mainnet-core-health] ERROR: void:mainnet_core:health:last_5m != 1 (got ${core_health_5m})"
  err=1
fi

if [[ "$manifest_health" != "1" ]]; then
  echo "[mainnet-core-health] ERROR: void_mainnet_core_manifest_health != 1 (got ${manifest_health})"
  err=1
fi

# manifest_days is a scalar; treat it as "days remaining"
days_int="${manifest_days%.*}"

if ! [[ "$days_int" =~ ^-?[0-9]+$ ]]; then
  echo "[mainnet-core-health] ERROR: void_mainnet_core_manifest_days is not an integer (${manifest_days})"
  err=1
else
  if (( days_int < 7 )); then
    echo "[mainnet-core-health] ERROR: manifest days < 7 (days=${days_int})"
    err=1
  fi
fi

if (( err != 0 )); then
  echo "[mainnet-core-health] RESULT: BAD (pillar not healthy or manifest too close to expiry)"
  exit 1
fi

echo "[mainnet-core-health] RESULT: OK (safeboot+core healthy, manifest_days>=7)"
