#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q_scalar() {
  local label="$1"
  local expr="$2"

  local val
  val=$(curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")

  printf "  %-45s = %s\n" "${label}" "${val}"
}

echo "[mainnet-usage-smoke] PROM_URL=${PROM_URL}"
echo

echo "=== [1] Mainnet core / last-mile / tokenomics / overall / pillars ==="
q_scalar "void:mainnet_core:health:last_5m"        'void:mainnet_core:health:last_5m'
q_scalar "void:mainnet_lastmile:health:last_5m"    'void:mainnet_lastmile:health:last_5m'
q_scalar "void:mainnet_tokenomics:health:last_5m"  'void:mainnet_tokenomics:health:last_5m'
q_scalar "void:mainnet_overall:health:last_5m"     'void:mainnet_overall:health:last_5m'
q_scalar "void:mainnet_pillars:health:last_5m"     'void:mainnet_pillars:health:last_5m'
echo

echo "=== [2] Last-mile detail (non-empty gap + sync) ==="
q_scalar "void:mainnet_lastmile:last_nonempty_gap" 'void:mainnet_lastmile:last_nonempty_gap'
q_scalar "void:txroot_health:last_5m"              'void:txroot_health:last_5m'
q_scalar "void:header3_match_v2_last:last_5m"      'void:header3_match_v2_last:last_5m'
q_scalar "void:mainnet_lastmile:sync:last_5m"      'void:mainnet_lastmile:sync:last_5m'
echo

echo "=== [3] Global pillars scalar ==="
q_scalar "void:pillars:health:last_5m"             'void:pillars:health:last_5m'
echo

echo "[mainnet-usage-smoke] RESULT:"

CORE=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_core:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
LASTMILE=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_lastmile:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
TOK=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_tokenomics:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
OVERALL=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_overall:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
PILLARS=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_pillars:health:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
SYNC=$(curl -fsS "${PROM_URL}/api/v1/query?query=max(void:mainnet_lastmile:sync:last_5m)" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")

if [ "${CORE}" = "1" ] && [ "${LASTMILE}" = "1" ] && [ "${TOK}" = "1" ] && [ "${OVERALL}" = "1" ] && [ "${PILLARS}" = "1" ] && [ "${SYNC}" = "1" ]; then
  echo "  OK (core + last-mile + tokenomics + pillars + sync all healthy)"
else
  echo "  BAD:"
  echo "    core=${CORE} lastmile=${LASTMILE} tokenomics=${TOK} overall=${OVERALL} pillars=${PILLARS} sync=${SYNC}"
fi

echo
echo "[mainnet-usage-smoke] DONE"
