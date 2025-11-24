#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [VOID mainnet core/tokenomics/overall – 5m recordings] ==="
echo

prom_vec() {
  local label="$1"
  local expr="$2"
  echo "[query:${label}] ${expr}"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
  | jq '.data.result'
  echo
}

prom_scalar() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
  | jq -r '.data.result[0].value[1] // "null"' \
  || echo "null"
}

# --- v1-style recordings (legacy) ---
prom_vec "core_v1"       'void:mainnet_core:health:last_5m'
prom_vec "tokenomics_v1" 'void:mainnet_tokenomics:health:last_5m'
prom_vec "overall_v1"    'void:mainnet_overall:health:last_5m'

# --- v2-style recordings (canonical) ---
prom_vec "core_v2"          'void:mainnet_overall_v2:core:last_5m'
prom_vec "tokenomics_v2"    'void:mainnet_overall_v2:tokenomics:last_5m'
prom_vec "overall_v2"       'void:mainnet_overall_v2:health:last_5m'
prom_vec "overall_v2_alias" 'void:mainnet_overall:health:last_5m_v2'

echo "=== [scalars] ==="
core_v1=$(prom_scalar 'void:mainnet_core:health:last_5m')
token_v1=$(prom_scalar 'void:mainnet_tokenomics:health:last_5m')
overall_v1=$(prom_scalar 'void:mainnet_overall:health:last_5m')

core_v2=$(prom_scalar 'void:mainnet_overall_v2:core:last_5m')
token_v2=$(prom_scalar 'void:mainnet_overall_v2:tokenomics:last_5m')
overall_v2=$(prom_scalar 'void:mainnet_overall_v2:health:last_5m')
overall_v2_alias=$(prom_scalar 'void:mainnet_overall:health:last_5m_v2')

echo "core_v1          = ${core_v1}"
echo "tokenomics_v1    = ${token_v1}"
echo "overall_v1       = ${overall_v1}"
echo "core_v2          = ${core_v2}"
echo "tokenomics_v2    = ${token_v2}"
echo "overall_v2       = ${overall_v2}"
echo "overall_v2_alias = ${overall_v2_alias}"
echo

echo "=== [summary] ==="
echo "  - core       : expect 1 (core_v2, falling back to core_v1 if needed)"
echo "  - tokenomics : expect 1"
echo "  - overall_v2 : expect 1 (canonical mainnet overall pillar)"
echo "  - note       : overall_v1 may be empty while v2 is the real source of truth."
