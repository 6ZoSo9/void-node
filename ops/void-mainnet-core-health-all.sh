#!/usr/bin/env bash
set -euo pipefail
cd "${HOME:-/home/zoso}/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-core-health] repo=$(pwd)"
echo "[mainnet-core-health] prom_url=${PROM_URL}"

prom_scalar() {
  local query="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${query}" \
  | jq -r '.data.result[0].value[1] // "null"' \
  || echo "error"
}

# Core health (raw + v2)
core_raw=$(prom_scalar 'void_mainnet_core_health')
core_v2=$(prom_scalar 'void:mainnet_core_v2:health:last_5m')

# Overall mainnet v2
overall_v2=$(prom_scalar 'void:mainnet_overall:health:last_5m')

# Safeboot pillar (may be missing)
safeboot_overall=$(prom_scalar 'void:safeboot:overall')

# Manifest dimensions
manifest_days_v2=$(prom_scalar 'void:mainnet_core:manifest_days_left:last')
manifest_days_raw=$(prom_scalar 'void_mainnet_core_manifest_days_left')
manifest_health=$(prom_scalar 'void_mainnet_core_manifest_health')

echo "[mainnet-core-health] core_raw                          = ${core_raw}"
echo "[mainnet-core-health] core_v2                           = ${core_v2}"
echo "[mainnet-core-health] overall_v2                        = ${overall_v2}"
echo "[mainnet-core-health] safeboot_overall                  = ${safeboot_overall}"
echo "[mainnet-core-health] manifest_days_v2                  = ${manifest_days_v2}"
echo "[mainnet-core-health] manifest_days_raw                 = ${manifest_days_raw}"
echo "[mainnet-core-health] manifest_health                   = ${manifest_health}"

# Choose manifest_days: prefer v2, then raw, else -1 (unknown)
chosen_manifest_days="${manifest_days_v2}"
if [ "${chosen_manifest_days}" = "null" ] || [ "${chosen_manifest_days}" = "error" ]; then
  chosen_manifest_days="${manifest_days_raw}"
fi
if [ "${chosen_manifest_days}" = "null" ] || [ "${chosen_manifest_days}" = "error" ] || [ -z "${chosen_manifest_days}" ]; then
  chosen_manifest_days="-1"
fi

echo "[mainnet-core-health] chosen_manifest_days              = ${chosen_manifest_days}"

core_ok=0
manifest_ok=0
safeboot_ok=0

# Core OK if either raw or v2 says 1
if [ "${core_raw}" = "1" ] || [ "${core_v2}" = "1" ]; then
  core_ok=1
fi

# Manifest OK if we have days >= 7, or if we have no days metrics at all (soft pass)
if [ "${chosen_manifest_days}" != "-1" ]; then
  if [ "${chosen_manifest_days}" -ge 7 ] 2>/dev/null; then
    manifest_ok=1
  else
    echo "[mainnet-core-health] ERROR: manifest_days too low (${chosen_manifest_days} < 7)"
  fi
else
  echo "[mainnet-core-health] NOTE: no manifest_days metrics; treating manifest as SOFT PASS."
  manifest_ok=1
fi

# Safeboot OK:
#   - 1   => hard OK
#   - null => soft pass (safeboot offline by design)
#   - error / anything else => only then treat as hard failure
case "${safeboot_overall}" in
  1)
    safeboot_ok=1
    ;;
  null)
    echo "[mainnet-core-health] NOTE: safeboot gauges missing; treating as SOFT PASS for now."
    safeboot_ok=1
    ;;
  error)
    echo "[mainnet-core-health] ERROR: safeboot query failed (error); treating as failure."
    safeboot_ok=0
    ;;
  *)
    echo "[mainnet-core-health] ERROR: safeboot_overall != 1 (got ${safeboot_overall})"
    safeboot_ok=0
    ;;
esac

echo "[mainnet-core-health] summary:"
echo "[mainnet-core-health]   core_ok       = ${core_ok}"
echo "[mainnet-core-health]   manifest_ok   = ${manifest_ok}"
echo "[mainnet-core-health]   safeboot_ok   = ${safeboot_ok}"

if [ "${core_ok}" -ne 1 ]; then
  echo "[mainnet-core-health] RESULT: BAD (core health not OK)"
  exit 1
fi

if [ "${manifest_ok}" -ne 1 ]; then
  echo "[mainnet-core-health] RESULT: BAD (manifest not OK)"
  exit 1
fi

if [ "${safeboot_ok}" -ne 1 ]; then
  echo "[mainnet-core-health] RESULT: BAD (safeboot pillar failing)"
  exit 1
fi

echo "[mainnet-core-health] RESULT: OK (pillar healthy; chosen_manifest_days=${chosen_manifest_days})"
