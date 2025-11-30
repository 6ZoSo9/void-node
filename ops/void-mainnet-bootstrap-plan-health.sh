#!/usr/bin/env bash
set -euo pipefail

REPO="\${REPO:-\$HOME/dev/void-node}"
TEXTFILE_DIR="\${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="\${TEXTFILE_DIR}/void_mainnet_bootstrap_plan.prom"

echo "=== [plan-health] VOID mainnet bootstrap PLAN exporter ==="
echo "[plan-health] REPO         = \$REPO"
echo "[plan-health] TEXTFILE_DIR = \$TEXTFILE_DIR"
echo "[plan-health] OUT          = \$OUT"
echo

cd "\$REPO"

echo "[plan-health] running dev PLAN rehearsal (no broadcasts)..."
HEALTH=0
if ./ops/void-mainnet-dev-plan-rehearsal.sh >/tmp/void-mainnet-dev-plan-rehearsal.log 2>&1; then
  HEALTH=1
  echo "[plan-health] dev PLAN rehearsal OK (exit=0) – marking health=1"
else
  echo "[plan-health] dev PLAN rehearsal FAILED – marking health=0 (see /tmp/void-mainnet-dev-plan-rehearsal.log)" >&2
fi
echo

echo "[plan-health] ensuring textfile dir exists (sudo may prompt)..."
sudo mkdir -p "\$TEXTFILE_DIR"

cat <<EOPROM | sudo tee "\$OUT" >/dev/null
# HELP void_mainnet_bootstrap_plan_health VOID mainnet bootstrap PLAN health (1=ok,0=bad)
# TYPE void_mainnet_bootstrap_plan_health gauge
void_mainnet_bootstrap_plan_health \$HEALTH
EOPROM

echo "[plan-health] done. Current value: \$HEALTH"
echo "[plan-health] You can inspect Prometheus via:"
echo "  curl -fsS \"http://127.0.0.1:9090/api/v1/query?query=void_mainnet_bootstrap_plan_health\" | jq '.data.result'"
