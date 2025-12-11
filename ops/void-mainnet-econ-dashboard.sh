#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

jq_check() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "[ERROR] jq is required but not installed. sudo apt install jq" >&2
    exit 1
  fi
}
jq_check

query() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

echo "=== [VOID mainnet econ dashboard] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [1] raw gauges] ==="

R_ECON_RAW="$(query 'void_mainnet_rewardengine_econ_health')"
R_ECON_5M="$(query 'void:mainnet_rewardengine_econ:health:last_5m')"
WC_PLAN_5M="$(query 'void:mainnet_workcredits_plan:health:last_5m')"
PILLARS_VAL_5M="$(query 'void:mainnet_pillars_with_validators:health:last_5m')"
COMBINED_5M="$(query "void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m")"

printf "  void_mainnet_rewardengine_econ_health                               = %s\n" "$R_ECON_RAW"
printf "  void:mainnet_rewardengine_econ:health:last_5m                        = %s\n" "$R_ECON_5M"
printf "  void:mainnet_workcredits_plan:health:last_5m                         = %s\n" "$WC_PLAN_5M"
printf "  void:mainnet_pillars_with_validators:health:last_5m                  = %s\n" "$PILLARS_VAL_5M"
printf "  void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m = %s\n" "$COMBINED_5M"
echo

echo "=== [2] interpretation] ==="

to_int() {
  local v="$1"
  case "$v" in
    1|1.0|1.000000) echo 1 ;;
    0|0.0|0.000000) echo 0 ;;
    *) echo -1 ;;
  esac
}

R_ECON_INT="$(to_int "$R_ECON_5M")"
WC_PLAN_INT="$(to_int "$WC_PLAN_5M")"
PILLARS_VAL_INT="$(to_int "$PILLARS_VAL_5M")"
COMBINED_INT="$(to_int "$COMBINED_5M")"

if [ "$PILLARS_VAL_INT" -eq 1 ]; then
  echo "- Pillars + validators (5m): OK"
elif [ "$PILLARS_VAL_INT" -eq 0 ]; then
  echo "- Pillars + validators (5m): NOT OK"
else
  echo "- Pillars + validators (5m): UNKNOWN (NaN / missing gauge)"
fi

if [ "$R_ECON_INT" -eq 1 ]; then
  echo "- RewardEngine econ (5m): OK (JSON present, parseable, and self-consistent)"
elif [ "$R_ECON_INT" -eq 0 ]; then
  echo "- RewardEngine econ (5m): NOT OK (check JSON + econ spec + metrics)"
else
  echo "- RewardEngine econ (5m): UNKNOWN (NaN / missing gauge)"
fi

if [ "$WC_PLAN_INT" -eq 1 ]; then
  echo "- WorkCredits PLAN (5m): OK (PLAN exporter + rules all green)"
elif [ "$WC_PLAN_INT" -eq 0 ]; then
  echo "- WorkCredits PLAN (5m): NOT OK (PLAN pillar unhealthy)"
else
  echo "- WorkCredits PLAN (5m): UNKNOWN (NaN / missing gauge)"
fi

echo

if [ "$COMBINED_INT" -eq 1 ]; then
  echo "[RESULT] OK: pillars + validators + RewardEngine econ + WorkCredits PLAN all healthy over last 5 minutes."
elif [ "$COMBINED_INT" -eq 0 ]; then
  echo "[RESULT] NOT OK: at least one of pillars/validators/RewardEngine/WorkCredits PLAN is unhealthy."
else
  echo "[RESULT] UNKNOWN: combined gauge missing or NaN; check Prometheus rules or exporters."
fi

echo
echo "[HINT] You can override PROM_URL if needed, e.g.:"
echo "       PROM_URL=http://devbox:9090 ./ops/void-mainnet-econ-dashboard.sh"
