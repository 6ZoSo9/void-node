#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

PLAN_HEALTH="$REPO_ROOT/ops/void-mainnet-planning-health-all.sh"
VAL_HEALTH="$REPO_ROOT/ops/void-mainnet-validators-health.sh"

echo "=== [planning-health-all-v2] VOID mainnet planning + validators ==="
echo "[cfg] REPO_ROOT      = $REPO_ROOT"
echo "[cfg] PLAN_HEALTH    = $PLAN_HEALTH"
echo "[cfg] VAL_HEALTH     = $VAL_HEALTH"
echo

plan_rc=0
val_rc=0

echo ">>> [1] mainnet planning health-all (keys + PLAN + run + pillars) ..."
set +e
"$PLAN_HEALTH"
plan_rc=$?
set -e
echo

echo ">>> [2] validators pillar health ..."
set +e
"$VAL_HEALTH"
val_rc=$?
set -e
echo

echo "=== [summary] ==="
echo "  plan_health_rc      = $plan_rc"
echo "  validators_health_rc= $val_rc"
echo

if [ "$plan_rc" -eq 0 ] && [ "$val_rc" -eq 0 ]; then
  echo "[planning-health-all-v2] RESULT: OK (planning + validators pillars healthy)"
  exit 0
fi

echo "[planning-health-all-v2] RESULT: BAD"
if [ "$plan_rc" -ne 0 ]; then
  echo "  - mainnet planning health-all FAILED (rc=$plan_rc)"
fi
if [ "$val_rc" -ne 0 ]; then
  echo "  - validators pillar FAILED (rc=$val_rc)"
fi

exit 1
