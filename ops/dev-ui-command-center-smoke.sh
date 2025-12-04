#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [dev-ui-command-center-smoke] VOID UI command center smoke ==="
echo

echo "=== [1] mainnet UI pillars health-all ==="
./ops/void-mainnet-ui-pillars-health-all.sh || echo "[warn] ui-pillars-health-all FAILED"

echo
echo "=== [2] dev dashboard HTML title ==="
DASHBOARD_URL="${DASHBOARD_URL:-http://127.0.0.1:4305/}"
UI_HEALTH_URL="${UI_HEALTH_URL:-http://127.0.0.1:4315/api/ui/health}"

curl -fsS "$DASHBOARD_URL" | grep -m1 '<title' || echo "[warn] <title> not found in dashboard HTML"

echo
echo "=== [3] UI health proxy summary ==="
curl -fsS "$UI_HEALTH_URL" | jq || echo "[warn] UI health JSON not available"

echo
echo "=== [dev-ui-command-center-smoke] done ==="
