#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-bootstrap-readiness] VOID mainnet bootstrap readiness ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

# 1) JSON-only invariants against LIVE config (no metrics, no RPC)
echo "=== [1] LIVE PLAN invariants (plan-sim JSON-only) ==="
PLAN_SIM_RC=0
if ./ops/void-mainnet-bootstrap-plan-sim.sh; then
  echo "[readiness] plan-sim: OK"
else
  PLAN_SIM_RC=$?
  echo "[readiness] plan-sim: FAILED (rc=$PLAN_SIM_RC)"
fi
echo

# 2) Mainnet health gates (dev PLAN rehearsal + textfile + Prom rules)
echo "=== [2] mainnet health gates (health-all) ==="
MAINNET_HEALTH_RC=0
if ./ops/void-mainnet-health-all.sh; then
  echo "[readiness] mainnet-health-all: OK"
else
  MAINNET_HEALTH_RC=$?
  echo "[readiness] mainnet-health-all: FAILED (rc=$MAINNET_HEALTH_RC)"
fi
echo

# 3) Broadcast gates aggregator (no broadcast, just scalar checks)
echo "=== [3] broadcast gates aggregator ==="
BROADCAST_GATES_RC=0
if ./ops/void-mainnet-bootstrap-broadcast-gates.sh; then
  echo "[readiness] broadcast-gates: OK (ELIGIBLE_TO_ARM should be 1)"
else
  BROADCAST_GATES_RC=$?
  echo "[readiness] broadcast-gates: FAILED (rc=$BROADCAST_GATES_RC)"
fi
echo

# 4) Textfile truth (plan metric)
PLAN_FILE="/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan.prom"
echo "=== [4] PLAN textfile truth ($PLAN_FILE) ==="
if sudo test -f "$PLAN_FILE"; then
  sudo cat "$PLAN_FILE"
else
  echo "[readiness] WARN: PLAN textfile not found at $PLAN_FILE"
fi
echo

echo "=== [5] summary ==="
echo "  plan-sim rc        = $PLAN_SIM_RC"
echo "  mainnet-health rc  = $MAINNET_HEALTH_RC"
echo "  broadcast-gates rc = $BROADCAST_GATES_RC"
echo

if [ "$PLAN_SIM_RC" -eq 0 ] && [ "$MAINNET_HEALTH_RC" -eq 0 ] && [ "$BROADCAST_GATES_RC" -eq 0 ]; then
  echo "[readiness] RESULT: READY-TO-ARM (all software gates green; broadcast script still hard-disabled)"
  exit 0
else
  echo "[readiness] RESULT: NOT READY (one or more gates failed)"
  exit 1
fi
