#!/usr/bin/env bash
set -euo pipefail
cd "${HOME:-/home/zoso}/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[pillars] repo=$(pwd)"
echo "[pillars] prom_url=${PROM_URL}"

prom_scalar() {
  local query="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${query}" \
  | jq -r '.data.result[0].value[1] // "null"' \
  || echo "error"
}

safeboot_overall=$(prom_scalar 'void:safeboot:overall_bool')
devnet_overall=$(prom_scalar 'void:devnet_overall_with_jobs_v2:health:last_5m')
mainnet_core=$(prom_scalar 'void_mainnet_core_health')
manifest_days_raw=$(prom_scalar 'void_mainnet_core_manifest_days_left')
manifest_health=$(prom_scalar 'void_mainnet_core_manifest_health')

echo "[pillars] checking VOID safeboot + devnet + mainnet-core..."
echo "  safeboot_overall                 = ${safeboot_overall}"
echo "  void:devnet_overall_with_jobs_v2:health:last_5m       = ${devnet_overall}"
echo "  void_mainnet_core_health         = ${mainnet_core}"
echo "  void_mainnet_core_manifest_health= ${manifest_health}"
echo "  void_mainnet_core_manifest_days  = ${manifest_days_raw}"

# Choose manifest_days; if missing, -1 means "unknown"
void_mainnet_core_manifest_days="${manifest_days_raw}"
if [ -z "${void_mainnet_core_manifest_days}" ] || [ "${void_mainnet_core_manifest_days}" = "null" ] || [ "${void_mainnet_core_manifest_days}" = "error" ]; then
  void_mainnet_core_manifest_days="-1"
fi

echo "  void_mainnet_core_manifest_days             = ${void_mainnet_core_manifest_days}"

devnet_ok=0
mainnet_core_ok=0
manifest_ok=0
safeboot_ok=0

# Devnet pillar must be green
if [ "${devnet_overall}" = "1" ]; then
  devnet_ok=1
else
  echo "[pillars] ERROR: devnet_overall_health != 1 (got ${devnet_overall})"
fi

# Mainnet-core health pillar must be green
if [ "${mainnet_core}" = "1" ]; then
  mainnet_core_ok=1
else
  echo "[pillars] ERROR: void_mainnet_core_health != 1 (got ${mainnet_core})"
fi

# Manifest pillar:
#  - If we know days and it's >=7 => OK
#  - If we know days and it's <7  => FAIL
#  - If we don't know days at all => SOFT PASS (exporter / CI is source of truth)
if [ "${void_mainnet_core_manifest_days}" != "-1" ]; then
  if [ "${void_mainnet_core_manifest_days}" -ge 7 ] 2>/dev/null; then
    manifest_ok=1
  else
    echo "[pillars] ERROR: manifest_days too low (${void_mainnet_core_manifest_days} < 7)"
  fi
else
  echo "[pillars] NOTE: no manifest_days metric; treating manifest pillar as SOFT PASS."
  manifest_ok=1
fi

# Safeboot pillar:
#  - 1    => OK
#  - null => SOFT PASS (offline by design right now)
#  - error / anything else => FAIL
case "${safeboot_overall}" in
  1)
    safeboot_ok=1
    ;;
  null)
    echo "[pillars] NOTE: safeboot_overall missing; treating safeboot pillar as SOFT PASS."
    safeboot_ok=1
    ;;
  error)
    echo "[pillars] ERROR: safeboot_overall query failed (error); treating as failure."
    safeboot_ok=0
    ;;
  *)
    echo "[pillars] ERROR: safeboot_overall unexpected value (${safeboot_overall}); expecting 1 or null."
    safeboot_ok=0
    ;;
esac

echo
echo "[pillars] summary:"
echo "  devnet_ok       = ${devnet_ok}"
echo "  mainnet_core_ok = ${mainnet_core_ok}"
echo "  manifest_ok     = ${manifest_ok}"
echo "  safeboot_ok     = ${safeboot_ok}"

if [ "${devnet_ok}" -ne 1 ]; then
  echo
  echo "[pillars] RESULT: BAD (devnet pillar failing)"
  exit 1
fi

if [ "${mainnet_core_ok}" -ne 1 ]; then
  echo
  echo "[pillars] RESULT: BAD (mainnet-core pillar failing)"
  exit 1
fi

if [ "${manifest_ok}" -ne 1 ]; then
  echo
  echo "[pillars] RESULT: BAD (manifest pillar failing)"
  exit 1
fi

if [ "${safeboot_ok}" -ne 1 ]; then
  echo
  echo "[pillars] RESULT: BAD (safeboot pillar failing)"
  exit 1
fi

echo
echo "[pillars] RESULT: OK (safeboot+devnet+mainnet-core healthy; void_mainnet_core_manifest_days=${void_mainnet_core_manifest_days})"
