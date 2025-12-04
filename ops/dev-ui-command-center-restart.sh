#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [dev-ui-command-center-restart] restart dev dashboard + UI smoke ==="

echo
echo "=== [1] (re)start dev dashboard server ==="
# Kill any existing dev_dashboard_server.ts processes (best-effort)
pgrep -f 'dev_dashboard_server\.ts' >/dev/null 2>&1 && {
  echo "[info] killing existing dev_dashboard_server.ts processes..."
  pkill -f 'dev_dashboard_server\.ts' || true
} || {
  echo "[info] no existing dev_dashboard_server.ts processes found"
}

# Start dashboard in the background
echo "[info] starting ./ops/dev-dashboard-serve.sh in background..."
nohup ./ops/dev-dashboard-serve.sh >/tmp/dev-dashboard-serve.log 2>&1 &

# Give it a moment to boot
sleep 3

echo
echo "=== [2] run UI command center smoke ==="
./ops/dev-ui-command-center-smoke.sh

echo
echo "=== [3] tail last few lines of dev-dashboard log (for sanity) ==="
tail -n 30 /tmp/dev-dashboard-serve.log || echo "[warn] no dev-dashboard log yet"

echo
echo "=== [dev-ui-command-center-restart] done ==="
