#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$TEXTFILE_DIR/void_mainnet_bootstrap_plan.prom}"

echo "=== [plan-health] VOID mainnet bootstrap PLAN exporter ==="
echo "[plan-health] REPO         = $REPO_ROOT"
echo "[plan-health] TEXTFILE_DIR = $TEXTFILE_DIR"
echo "[plan-health] OUT          = $OUT"

cd "$REPO_ROOT"

health=0
reason="unknown"

echo
echo "[plan-health] running dev PLAN rehearsal (no broadcasts)..."

# Prefer dedicated dev helper if present
if [[ -x "ops/void-mainnet-bootstrap-plan-dev.sh" ]]; then
  if ./ops/void-mainnet-bootstrap-plan-dev.sh; then
    echo "[plan-health] dev PLAN rehearsal OK (exit=0)"
    health=1
    reason="ok"
  else
    rc=$?
    echo "[plan-health] dev PLAN rehearsal FAILED (exit=$rc)"
    health=0
    reason="dev_plan_failed_exit_$rc"
  fi
else
  echo "[plan-health] WARNING: ops/void-mainnet-bootstrap-plan-dev.sh not found or not executable"
  echo "[plan-health] you should create that helper; for now, marking health=0"
  health=0
  reason="missing_dev_helper"
fi

echo
echo "[plan-health] ensuring textfile dir exists (sudo may prompt)..."
sudo mkdir -p "$TEXTFILE_DIR"

echo "[plan-health] writing metric to $OUT (sudo tee)..."
cat <<EOF | sudo tee "$OUT" >/dev/null
# HELP void_mainnet_bootstrap_plan_configured Is mainnet bootstrap plan structurally configured (config JSON sane)?
# TYPE void_mainnet_bootstrap_plan_configured gauge
void_mainnet_bootstrap_plan_configured 1

# HELP void_mainnet_bootstrap_plan_health Are all critical roles/contracts/validator0 fields wired for mainnet bootstrap?
# TYPE void_mainnet_bootstrap_plan_health gauge
void_mainnet_bootstrap_plan_health $health

# HELP void_mainnet_bootstrap_plan_health_info Info about VOID mainnet bootstrap PLAN readiness
# TYPE void_mainnet_bootstrap_plan_health_info gauge
void_mainnet_bootstrap_plan_health_info{reason="$reason"} 1
EOF

echo "[plan-health] done. Current value: $health (reason=$reason)"
echo "[plan-health] You can inspect Prometheus via:"
echo "  curl -fsS \"http://127.0.0.1:9090/api/v1/query?query=void_mainnet_bootstrap_plan_health\" | jq '.data.result'"
