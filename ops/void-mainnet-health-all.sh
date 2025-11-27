#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-health-all] PROM_URL=$PROM_URL"

query_json() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=${expr}"
}

query_scalar() {
  local expr="$1"
  query_json "$expr" \
    | jq -r 'if .data.result|length>0 then .data.result[0].value[1] else "NaN" end'
}

pretty_query() {
  local label="$1"
  local expr="$2"
  echo
  echo ">>> $label"
  query_json "$expr" | jq '.data.result'
}

# Diagnostics (non-gating)
pretty_query 'void:mainnet_overall:health:last_5m_v2' 'void:mainnet_overall:health:last_5m_v2'
pretty_query 'void:mainnet_pillars:health:last_5m'    'void:mainnet_pillars:health:last_5m'
pretty_query 'void:mainnet_lastmile:health:last_5m'   'void:mainnet_lastmile:health:last_5m'
pretty_query 'void:mainnet_lastmile_health:last'      'void:mainnet_lastmile_health:last'
pretty_query 'void_safeboot_overall_health'           'void_safeboot_overall_health'

echo
echo "=== [gating scalars] ==="

pillars_5m="$(query_scalar 'void:mainnet_pillars:health:last_5m')"
echo "void:mainnet_pillars:health:last_5m=${pillars_5m}"

lastmile_5m="$(query_scalar 'void:mainnet_lastmile:health:last_5m')"
echo "void:mainnet_lastmile:health:last_5m=${lastmile_5m}"

err=0

if [[ "${pillars_5m}" != "1" ]]; then
  echo "[warn] void:mainnet_pillars:health:last_5m != 1 (got ${pillars_5m})"
  err=1
fi

if [[ "${lastmile_5m}" != "1" ]]; then
  echo "[warn] void:mainnet_lastmile:health:last_5m != 1 (got ${lastmile_5m})"
  err=1
fi

if [[ "${err}" -eq 0 ]]; then
  echo
  echo "[mainnet-health-all] RESULT: OK (pillars + lastmile 5m == 1; overall_v2 is informational only)"
  exit 0
else
  echo
  echo "[mainnet-health-all] RESULT: BAD (see warnings above)"
  exit 1
fi
