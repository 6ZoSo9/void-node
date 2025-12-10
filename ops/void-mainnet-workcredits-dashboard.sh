#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

echo "=== [VOID mainnet — WorkCredits dashboard helper] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

echo "=== [raw gauges] ==="
WC_HEALTH_RAW="$(q 'void_mainnet_workcredits_health')"
WC_PLAN_HEALTH="$(q 'void_mainnet_workcredits_plan_health')"
echo "  void_mainnet_workcredits_health          = $WC_HEALTH_RAW"
echo "  void_mainnet_workcredits_plan_health     = $WC_PLAN_HEALTH"
echo

echo "=== [5m views] ==="
WC_HEALTH_5M="$(q 'void:mainnet_workcredits:health:last_5m')"
PILLARS_WC_5M="$(q 'void:mainnet_pillars_with_validators_and_workcredits:health:last_5m')"
echo "  void:mainnet_workcredits:health:last_5m                              = $WC_HEALTH_5M"
echo "  void:mainnet_pillars_with_validators_and_workcredits:health:last_5m  = $PILLARS_WC_5M"
echo

echo "=== [interpretation] ==="
if [[ "$WC_HEALTH_5M" == "1" && "$WC_PLAN_HEALTH" == "1" ]]; then
  echo "  - WorkCredits pillar is GREEN (5m view == 1) and PLAN stub is GREEN."
elif [[ "$WC_PLAN_HEALTH" != "1" ]]; then
  echo "  - PLAN gauge is NOT healthy (plan_health != 1) — fix exporter/textfile first."
elif [[ "$WC_HEALTH_5M" != "1" ]]; then
  echo "  - Pillar 5m view != 1 — check void_mainnet_workcredits_health and exporter."
else
  echo "  - Mixed state; check gauges above."
fi
echo

echo "=== [Grafana / PromQL cheat-sheet] ==="
cat <<'EOF'
Single-stat / gauge:
  void_mainnet_workcredits_health
  void_mainnet_workcredits_plan_health
  void:mainnet_workcredits:health:last_5m
  void:mainnet_pillars_with_validators_and_workcredits:health:last_5m

Recommended panels:
  - WorkCredits Pillar (5m):
      query: void:mainnet_workcredits:health:last_5m
  - WorkCredits PLAN health:
      query: void_mainnet_workcredits_plan_health
  - Pillars + Validators + WorkCredits (5m):
      query: void:mainnet_pillars_with_validators_and_workcredits:health:last_5m
EOF
echo

echo "[workcredits-dashboard] DONE."
