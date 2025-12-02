#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
REPO="${REPO_ROOT:-$HOME/dev/void-node}"
CHOSEN_MANIFEST_DAYS="${CHOSEN_MANIFEST_DAYS:-365}"

echo "[pillars] repo=${REPO}"
echo "[pillars] prom_url=${PROM_URL}"
echo "[pillars] checking VOID safeboot + devnet + mainnet-core + manifest + keys + run..."

get_gauge() {
  # Try each query in order, return the first non-empty result.
  if [ "$#" -lt 1 ]; then
    echo "[pillars] get_gauge: no query provided" >&2
    exit 1
  fi

  local q raw val
  for q in "$@"; do
    raw="$(curl -fsS "${PROM_URL}/api/v1/query?query=${q}")" || {
      echo "[pillars] WARN: curl failed for query=${q}" >&2
      continue
    }
    val="$(printf '%s\n' "$raw" | jq -r '.data.result[0].value[1] // empty')"
    if [ -n "$val" ]; then
      printf '%s\n' "$val"
      return 0
    fi
  done

  echo "[pillars] ERROR: no result for any of queries: $*" >&2
  exit 1
}

SAFEBOOT_OVERALL="$(get_gauge 'safeboot_overall' 'void:safeboot:overall')"
DEVNET_OVERALL="$(get_gauge 'void_devnet_overall_health')"
MAINNET_CORE_HEALTH="$(get_gauge 'void_mainnet_core_health')"
MAINNET_CORE_MANIFEST_HEALTH="$(get_gauge 'void_mainnet_core_manifest_health')"
MAINNET_CORE_MANIFEST_DAYS_LEFT="$(get_gauge 'void:mainnet_core:manifest_days_left:last')"
MAINNET_KEYS_HEALTH="$(get_gauge 'void_mainnet_keys_health')"
RUN_PILLAR_OK_5M="$(get_gauge 'void:mainnet_run_pillar:ok:last_5m')"
COMPOSITE_OK_5M="$(get_gauge 'void:mainnet_pillars:health_with_keys_and_run:last_5m')"

echo "  safeboot_overall                          = ${SAFEBOOT_OVERALL}"
echo "  void_devnet_overall_health                = ${DEVNET_OVERALL}"
echo "  void_mainnet_core_health                  = ${MAINNET_CORE_HEALTH}"
echo "  void_mainnet_core_manifest_health         = ${MAINNET_CORE_MANIFEST_HEALTH}"
echo "  void:mainnet_core:manifest_days_left:last = ${MAINNET_CORE_MANIFEST_DAYS_LEFT}"
echo "  void_mainnet_keys_health                  = ${MAINNET_KEYS_HEALTH}"
echo "  void:mainnet_run_pillar:ok:last_5m        = ${RUN_PILLAR_OK_5M}"
echo "  void:mainnet_pillars:health_with_keys_and_run:last_5m = ${COMPOSITE_OK_5M}"
echo "  chosen_manifest_days                      = ${CHOSEN_MANIFEST_DAYS}"

DEVNET_OK=0
MAINNET_CORE_OK=0
MANIFEST_OK=0
SAFEBOOT_OK=0
KEYS_OK=0
RUN_OK=0
COMPOSITE_OK=0

[ "${SAFEBOOT_OVERALL}" = "1" ] && SAFEBOOT_OK=1
[ "${DEVNET_OVERALL}" = "1" ] && DEVNET_OK=1
[ "${MAINNET_CORE_HEALTH}" = "1" ] && MAINNET_CORE_OK=1
[ "${MAINNET_CORE_MANIFEST_HEALTH}" = "1" ] && MANIFEST_OK=1
[ "${MAINNET_KEYS_HEALTH}" = "1" ] && KEYS_OK=1
[ "${RUN_PILLAR_OK_5M}" = "1" ] && RUN_OK=1
[ "${COMPOSITE_OK_5M}" = "1" ] && COMPOSITE_OK=1

# Manifest days guard (numeric compare; strip decimals if any)
if [ "${MAINNET_CORE_MANIFEST_DAYS_LEFT%.*}" -ge "${CHOSEN_MANIFEST_DAYS}" ] 2>/dev/null; then
  MANIFEST_OK=1
else
  MANIFEST_OK=0
fi

echo
echo "[pillars] summary:"
echo "  devnet_ok        = ${DEVNET_OK}"
echo "  mainnet_core_ok  = ${MAINNET_CORE_OK}"
echo "  manifest_ok      = ${MANIFEST_OK}"
echo "  safeboot_ok      = ${SAFEBOOT_OK}"
echo "  keys_ok          = ${KEYS_OK}"
echo "  run_ok           = ${RUN_OK}"
echo "  composite_ok     = ${COMPOSITE_OK}"

OVERALL_OK=1
for flag in "${DEVNET_OK}" "${MAINNET_CORE_OK}" "${MANIFEST_OK}" "${SAFEBOOT_OK}" "${KEYS_OK}" "${RUN_OK}" "${COMPOSITE_OK}"; do
  if [ "$flag" != "1" ]; then
    OVERALL_OK=0
  fi
done

echo
if [ "${OVERALL_OK}" = "1" ]; then
  echo "[pillars] RESULT: OK (safeboot+devnet+mainnet-core+manifest+keys+run healthy; chosen_manifest_days=${CHOSEN_MANIFEST_DAYS})"
  exit 0
else
  echo "[pillars] RESULT: BAD (one or more pillars unhealthy; see summary above)"
  exit 1
fi
