#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

echo "=== [WorkCredits + RewardEngine HEALTH-ALL (dev + mainnet)] ==="

echo
echo "=== [1] DEV – WorkCredits + RewardEngine tests/plan (forge-level) ==="
if ./ops/dev-workcredits-rewardengine-health-all.sh; then
  echo "[dev] WorkCredits + RewardEngine dev/test health: OK"
else
  echo "[dev] WorkCredits + RewardEngine dev/test health: FAILED"
  exit 1
fi

echo
echo "=== [2] MAINNET – RewardEngine econ + WorkCredits PLAN + pillars/validators ==="
if ./ops/void-mainnet-rewardengine-workcredits-health-all.sh; then
  echo "[mainnet] RewardEngine econ + WorkCredits PLAN + pillars/validators: OK"
else
  echo "[mainnet] RewardEngine econ + WorkCredits PLAN + pillars/validators: FAILED"
  exit 1
fi

echo
echo "[workcredits-rewardengine-health-all] RESULT: OK (dev + mainnet RewardEngine/WorkCredits both healthy)"
