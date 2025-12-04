#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PORT="${VOID_UI_HEALTH_PORT:-4315}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [dev-ui-health] starting UI health proxy ==="
echo "    URL      : http://127.0.0.1:${PORT}/api/ui/health"
echo "    PROM_URL : ${PROM_URL}"
echo "    (override with VOID_UI_HEALTH_PORT=<port>, PROM_URL=<url>)"
echo

VOID_UI_HEALTH_PORT="${PORT}" PROM_URL="${PROM_URL}" \
  npx --yes tsx scripts/dev_ui_health_server.ts
