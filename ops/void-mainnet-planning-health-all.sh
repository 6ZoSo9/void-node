#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [planning-health] VOID mainnet planning-phase health ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo

echo "=== [0] latest PLAN snapshot ==="
if ls logs/mainnet-plan/plan-*.log >/dev/null 2>&1; then
  LAST="$(ls -1 logs/mainnet-plan/plan-*.log | sort | tail -n1)"
  echo "  last_snapshot = $LAST"
else
  echo "  last_snapshot = (none yet, taking one now)"
fi
echo

# Always take a fresh PLAN snapshot (non-fatal).
if [ -x ./ops/void-mainnet-plan-snapshot.sh ]; then
  ./ops/void-mainnet-plan-snapshot.sh || echo "[planning-health] WARN: plan snapshot failed (non-fatal)"
else
  echo "[planning-health] WARN: ./ops/void-mainnet-plan-snapshot.sh missing"
fi

echo
echo "=== [1] bootstrap PLAN checklist ==="
if [ -x ./ops/void-mainnet-bootstrap-plan-checklist.sh ]; then
  ./ops/void-mainnet-bootstrap-plan-checklist.sh || echo "[planning-health] WARN: checklist failed"
else
  echo "[planning-health] WARN: ./ops/void-mainnet-bootstrap-plan-checklist.sh missing"
fi

echo
echo "=== [2] bootstrap PLAN sim (stub) ==="
if [ -x ./ops/void-mainnet-bootstrap-plan-sim.sh ]; then
  ./ops/void-mainnet-bootstrap-plan-sim.sh || echo "[planning-health] WARN: plan-sim failed (expected if still stub)"
else
  echo "[planning-health] WARN: ./ops/void-mainnet-bootstrap-plan-sim.sh missing"
fi

echo
echo "=== [planning-health] DONE ==="
