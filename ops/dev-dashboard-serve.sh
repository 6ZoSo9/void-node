#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PORT="${VOID_DASHBOARD_PORT:-4305}"

echo "=== [dev-dashboard] starting Main Dashboard on http://127.0.0.1:${PORT}/ ==="
echo "    (override with VOID_DASHBOARD_PORT=<port>)"
echo

npx --yes tsx scripts/dev_dashboard_server.ts
