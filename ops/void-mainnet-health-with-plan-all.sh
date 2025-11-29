#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-health-with-plan-all] PROM_URL=${PROM_URL}"
echo

q() {
  local name="$1"
  local expr="$2"
  echo ">>> ${name}"
  curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" | jq '.data.result'
  echo
}

# --- Base metrics (for context) ---
q 'void:mainnet_pillars:health:last_5m' \
  'void:mainnet_pillars:health:last_5m'

q 'void:mainnet_overall:health:last_5m_v2' \
  'void:mainnet_overall:health:last_5m_v2'

q 'void:mainnet_bootstrap_plan:health:last_5m' \
  'void:mainnet_bootstrap_plan:health:last_5m'

# --- With-PLAN metrics (new recordings) ---
q 'void:mainnet_pillars_with_plan:health:last_5m' \
  'void:mainnet_pillars_with_plan:health:last_5m'

q 'void:mainnet_overall_with_plan:health:last_5m' \
  'void:mainnet_overall_with_plan:health:last_5m'

echo "=== [gating scalars] ==="

pillars_with_plan=$(
  curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_pillars_with_plan:health:last_5m" \
    | jq -r '.data.result[0].value[1] // "NaN"'
)

overall_with_plan=$(
  curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_overall_with_plan:health:last_5m" \
    | jq -r '.data.result[0].value[1] // "NaN"'
)

echo "void:mainnet_pillars_with_plan:health:last_5m=${pillars_with_plan}"
echo "void:mainnet_overall_with_plan:health:last_5m=${overall_with_plan}"
echo

if [ "${pillars_with_plan}" = "1" ] && [ "${overall_with_plan}" = "1" ]; then
  echo "[mainnet-health-with-plan-all] RESULT: OK (pillars_with_plan + overall_with_plan 5m == 1)"
  exit 0
fi

echo "[mainnet-health-with-plan-all] RESULT: NOT_OK"
echo "  pillars_with_plan=${pillars_with_plan}"
echo "  overall_with_plan=${overall_with_plan}"
exit 1
