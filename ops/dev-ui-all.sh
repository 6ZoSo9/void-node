#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [dev-ui-all] VOID UI stack (health proxy + dashboard + smoke) ==="

UI_HEALTH_PORT="${VOID_UI_HEALTH_PORT:-4315}"
DASHBOARD_PORT="${VOID_DASHBOARD_PORT:-4305}"

echo
echo "=== [1] (re)start dev UI health proxy ==="
# Kill any existing dev-ui-health-serve.sh processes
pkill -f "dev-ui-health-serve.sh" 2>/dev/null || true
# Start in background so this script can continue
./ops/dev-ui-health-serve.sh > /tmp/void-ui-health.log 2>&1 &
UI_HEALTH_PID=$!
echo "  -> UI health proxy PID: ${UI_HEALTH_PID} (port ${UI_HEALTH_PORT})"

sleep 1

echo
echo "=== [2] (re)start dev dashboard server ==="
pkill -f "dev_dashboard_server.ts" 2>/dev/null || true
./ops/dev-dashboard-serve.sh > /tmp/void-dev-dashboard.log 2>&1 &
DASH_PID=$!
echo "  -> Dashboard PID: ${DASH_PID} (port ${DASHBOARD_PORT})"

sleep 2

echo
echo "=== [3] run UI command center smoke ==="
./ops/dev-ui-command-center-smoke.sh || {
  echo "[dev-ui-all] smoke FAILED, check logs:"
  echo "  - /tmp/void-ui-health.log"
  echo "  - /tmp/void-dev-dashboard.log"
  exit 1
}

echo
echo "=== [4] summary ==="
echo "  UI health proxy : http://127.0.0.1:${UI_HEALTH_PORT}/api/ui/health"
echo "  Dashboard       : http://127.0.0.1:${DASHBOARD_PORT}/"
echo
echo "  To watch logs:"
echo "    tail -n 50 -f /tmp/void-ui-health.log"
echo "    tail -n 50 -f /tmp/void-dev-dashboard.log"
echo
echo "=== [dev-ui-all] done ==="
