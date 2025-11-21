#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

log() {
  printf '[mainnet-overall] %s\n' "$*" >&2
}

query() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"'
}

log "prom_url=${PROM_URL}"

# Core pieces
safeboot_overall="$(query 'void:safeboot:overall')"
core_health_raw="$(query 'void_mainnet_core_health')"
core_health_5m="$(query 'void:mainnet_core:health:last_5m')"
manifest_health="$(query 'void_mainnet_core_manifest_health')"
manifest_days_raw="$(query 'void_mainnet_core_manifest_days_left')"

# Tokenomics pillar (best-effort)
tokenomics_5m="$(query 'void:mainnet_tokenomics:health:last_5m' || echo 'null')"

# Overall mainnet view
overall_5m="$(query 'void:mainnet_overall:health:last_5m')"

log "gauges:"
log "  safeboot_overall                     = ${safeboot_overall}"
log "  void_mainnet_core_health             = ${core_health_raw}"
log "  void:mainnet_core:health:last_5m     = ${core_health_5m}"
log "  void_mainnet_core_manifest_health    = ${manifest_health}"
log "  void_mainnet_core_manifest_days_left = ${manifest_days_raw}"
log "  void:mainnet_tokenomics:health:last_5m = ${tokenomics_5m}"
log "  void:mainnet_overall:health:last_5m  = ${overall_5m}"

# Interpret manifest days
manifest_days_int=-1
if [ "${manifest_days_raw}" != "null" ]; then
  manifest_days_int="$(awk -v v="${manifest_days_raw}" 'BEGIN { if (v ~ /^[0-9.]+$/) { printf "%.0f\n", v } else { print -1 } }')"
fi

log "derived:"
log "  manifest_days_int                    = ${manifest_days_int}"

ok=1

# Hard checks
if [ "${safeboot_overall}" != "1" ]; then
  log "FAIL: safeboot_overall != 1"
  ok=0
fi

if [ "${core_health_raw}" != "1" ]; then
  log "FAIL: void_mainnet_core_health != 1"
  ok=0
fi

if [ "${core_health_5m}" != "1" ]; then
  log "FAIL: void:mainnet_core:health:last_5m != 1"
  ok=0
fi

if [ "${manifest_health}" != "1" ]; then
  log "FAIL: void_mainnet_core_manifest_health != 1"
  ok=0
fi

if [ "${manifest_days_int}" -lt 7 ]; then
  log "FAIL: void_mainnet_core_manifest_days_left < 7 (got ${manifest_days_int})"
  ok=0
fi

if [ "${overall_5m}" != "1" ]; then
  log "FAIL: void:mainnet_overall:health:last_5m != 1"
  ok=0
fi

# Tokenomics is best-effort: if present, insist it is 1; if null, just warn.
if [ "${tokenomics_5m}" != "null" ] && [ "${tokenomics_5m}" != "1" ]; then
  log "FAIL: void:mainnet_tokenomics:health:last_5m != 1 (got ${tokenomics_5m})"
  ok=0
elif [ "${tokenomics_5m}" = "null" ]; then
  log "NOTE: void:mainnet_tokenomics:health:last_5m not found; not gating on it (yet)"
fi

if [ "${ok}" -eq 1 ]; then
  log "RESULT: OK (safeboot + mainnet core + manifest + overall all healthy, days_left>=7)"
  exit 0
else
  log "RESULT: BAD (one or more mainnet-overall checks failed)"
  exit 1
fi
