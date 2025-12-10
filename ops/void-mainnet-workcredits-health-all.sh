#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

echo "=== [workcredits-health-all] VOID mainnet WorkCredits health ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

HEALTH_RAW="$(q 'void_mainnet_workcredits_health')"
PLAN_HEALTH="$(q 'void_mainnet_workcredits_plan_health')"
HEALTH_5M="$(q 'void:mainnet_workcredits:health:last_5m')"
COMPOSITE_5M="$(q 'void:mainnet_pillars_with_validators_and_workcredits:health:last_5m')"

echo "=== [raw gauges] ==="
echo "  void_mainnet_workcredits_health                            = $HEALTH_RAW"
echo "  void_mainnet_workcredits_plan_health                       = $PLAN_HEALTH"
echo
echo "=== [5m views] ==="
echo "  void:mainnet_workcredits:health:last_5m                    = $HEALTH_5M"
echo "  void:mainnet_pillars_with_validators_and_workcredits:health:last_5m = $COMPOSITE_5M"
echo

RESULT="UNKNOWN"

if [[ "$HEALTH_5M" == "1" && "$PLAN_HEALTH" == "1" ]]; then
  RESULT="OK"
  echo "[summary] WorkCredits pillar + PLAN look healthy (5m view == 1, plan == 1)."
elif [[ "$PLAN_HEALTH" != "1" ]]; then
  RESULT="PLAN_BAD"
  echo "[summary] WorkCredits PLAN gauge is not healthy (plan_health != 1)."
elif [[ "$HEALTH_5M" != "1" ]]; then
  RESULT="PILLAR_BAD"
  echo "[summary] WorkCredits pillar 5m view is not healthy (health_5m != 1)."
else
  echo "[summary] WorkCredits health in an unexpected state (check gauges above)."
fi

echo
echo "[workcredits-health-all] RESULT: $RESULT"
