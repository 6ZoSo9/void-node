#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-core-diag] prom_url=$PROM_URL"

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "null"'
}

show() {
  local label="$1"
  local expr="$2"
  printf "\n[%s] %s\n" "$label" "$expr"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$expr" \
    | jq -r '.data.result[]? | [.metric, .value] | @json' || echo "null"
}

echo "=== [scalar health rollups] ==="
echo "core_health(last_5m)       = $(q 'void:mainnet_core:health:last_5m')"
echo "tokenomics_health(last_5m) = $(q 'void:mainnet_tokenomics:health:last_5m')"
echo "overall_health(last_5m)    = $(q 'void:mainnet_overall:health:last_5m')"

echo
echo "=== [raw gauges] ==="
echo "void_mainnet_core_health        = $(q 'void_mainnet_core_health')"
echo "void_mainnet_tokenomics_health  = $(q 'void_mainnet_tokenomics_health')"
echo "void_mainnet_overall_health     = $(q 'void_mainnet_overall_health')"

echo
echo "=== [manifest days left] ==="
echo "void_mainnet_core_manifest_days_left        = $(q 'void_mainnet_core_manifest_days_left')"
echo "void:mainnet_core:manifest_days_left:last  = $(q 'void:mainnet_core:manifest_days_left:last')"

echo
echo "=== [safeboot linkage sanity] ==="
show 'safeboot_overall'    'void:safeboot:overall'
show 'safeboot_health_ok'  'void:safeboot:health_ok'
show 'safeboot_head_ok'    'void:safeboot:head_ok'

echo
echo "[mainnet-core-diag] done."
