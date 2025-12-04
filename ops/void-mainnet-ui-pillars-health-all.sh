#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [ui-pillars-health-all] VOID mainnet UI pillars (WC + Dashboard) ==="
echo "[cfg] PROM_URL = ${PROM_URL}"
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

echo "=== [1] raw gauges (instant) ==="
ui_wc="$(q void_mainnet_ui_work_credits_health)"
ui_dash="$(q void_mainnet_ui_dashboard_health)"
ui_pillars="$(q void_mainnet_ui_pillars_health)"

echo "  void_mainnet_ui_work_credits_health  = ${ui_wc}"
echo "  void_mainnet_ui_dashboard_health     = ${ui_dash}"
echo "  void_mainnet_ui_pillars_health       = ${ui_pillars}"
echo

echo "=== [2] recorded 5m views ==="
pillars_5m="$(q 'void:mainnet_pillars:health:last_5m')"
ui_5m="$(q 'void:mainnet_ui_pillars:health:last_5m')"
with_ui_5m="$(q 'void:mainnet_pillars_with_ui:health:last_5m')"

echo "  void:mainnet_pillars:health:last_5m        = ${pillars_5m}"
echo "  void:mainnet_ui_pillars:health:last_5m     = ${ui_5m}"
echo "  void:mainnet_pillars_with_ui:health:last_5m= ${with_ui_5m}"
echo

ok() {
  [ "$1" = "1" ]
}

overall="BAD"
if ok "${pillars_5m}" && ok "${ui_5m}" && ok "${with_ui_5m}"; then
  overall="OK"
fi

echo "=== [3] summary ==="
echo "  core pillars  (without UI): ${pillars_5m}"
echo "  ui pillars           (wc+dash): ${ui_5m}"
echo "  mainnet pillars WITH ui      : ${with_ui_5m}"
echo
echo "[ui-pillars-health-all] RESULT: ${overall}"
