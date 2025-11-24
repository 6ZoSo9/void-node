#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q_scalar() {
  local label="$1"
  local expr="$2"

  local val
  val=$(curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")

  printf "  %-35s = %s\n" "${label}" "${val}"
}

echo "[pillars-v2] PROM_URL=${PROM_URL}"
echo

echo "=== [1] Mainnet core / last-mile / tokenomics / overall ==="
q_scalar "void:mainnet_core:health:last_5m"      'void:mainnet_core:health:last_5m'
q_scalar "void:mainnet_lastmile:health:last_5m"  'void:mainnet_lastmile:health:last_5m'
q_scalar "void:mainnet_tokenomics:health:last_5m" 'void:mainnet_tokenomics:health:last_5m'
q_scalar "void:mainnet_overall:health:last_5m"   'void:mainnet_overall:health:last_5m'
q_scalar "void:mainnet_pillars:health:last_5m"   'void:mainnet_pillars:health:last_5m'
echo

echo "=== [2] Devnet v1 + v2 (core + coverage + agents) ==="
q_scalar "void:devnet_overall:max_5m"            'void:devnet_overall:max_5m'
q_scalar "void:devnet_overall_v2:health:last_5m" 'void:devnet_overall_v2:health:last_5m'
q_scalar "void:devnet_coverage:last_5m"          'void:devnet_coverage:last_5m'
q_scalar "void:agent_receipts_coverage:last_5m"  'void:agent_receipts_coverage:last_5m'
echo

echo "=== [3] Safeboot pillar gauges (textfile + overall) ==="
q_scalar "void_pillars_safeboot_ok"              'void_pillars_safeboot_ok'
q_scalar "void_safeboot_overall_health"          'void_safeboot_overall_health'
q_scalar "void:safeboot:overall"                 'void:safeboot:overall'
echo

echo "=== [4] Global pillars scalar ==="
q_scalar "void:pillars:health:last_5m"           'void:pillars:health:last_5m'
echo

echo "[pillars-v2] RESULT:"
CORE=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_core:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
DEV_V2=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:devnet_overall_v2:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
SAFE=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:safeboot:overall)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
GLOBAL=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:pillars:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

if [ "${CORE}" = "1" ] && [ "${DEV_V2}" = "1" ] && [ "${SAFE}" = "1" ] && [ "${GLOBAL}" = "1" ]; then
  echo "  OK (core + devnet v2 + safeboot + global pillars all healthy)"
else
  echo "  BAD:"
  echo "    core=${CORE} devnet_v2=${DEV_V2} safeboot=${SAFE} global=${GLOBAL}"
fi
