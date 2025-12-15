#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  local label="$2"
  local val
  val=$(curl -fsS "$PROM_URL/api/v1/query" \
        --get --data-urlencode "query=${expr}" \
        | jq -r '.data.result[0].value[1] // "null"' \
        || echo "ERR")
  printf "  %-40s = %s\n" "$label" "$val"
}

echo "[pillars-dashboard] PROM_URL=${PROM_URL}"
echo

echo "=== Devnet ==="
q 'void:devnet_overall_with_jobs_v2:health:last_5m'              'devnet_overall'
q 'void:devnet_overall:max_5m'              'devnet_overall_5m'

echo
echo "=== Mainnet core / manifest ==="
q 'void_mainnet_core_health'                'mainnet_core_health'
q 'void:mainnet_core:health:last_5m'        'mainnet_core_5m'
q 'void_mainnet_core_manifest_health'       'manifest_health'
q 'void:mainnet_core:manifest_days_left:last' 'manifest_days_left_last'

echo
echo "=== Tokenomics ==="
q 'void_mainnet_tokenomics_health'          'tokenomics_health'
q 'void:mainnet_tokenomics:health:last_5m'  'tokenomics_5m'

echo
echo "=== Last-mile ==="
q 'void_mainnet_lastmile_health'            'lastmile_health'
q 'void:mainnet_lastmile:health:last_5m'    'lastmile_5m'

echo
echo "=== Safeboot ==="
q 'void_safeboot_overall_health'            'safeboot_overall'

echo
echo "=== Pillars ==="
q 'void:mainnet_pillars:health:last_5m'     'pillars_v1_5m'
q 'void:mainnet_pillars:health:last_5m_v2'  'pillars_v2_5m'

echo
echo "=== Mainnet overall ==="
q 'void:mainnet_overall:health:last_5m'     'mainnet_overall_v1_5m'
q 'void:mainnet_overall:health:last_5m_v2'  'mainnet_overall_v2_5m'

echo
echo "[pillars-dashboard] Done."
