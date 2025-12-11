#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

echo "=== [mainnet RewardEngine + WorkCredits health-all] ==="

echo
echo "=== [1] RewardEngine econ params health (mainnet) ==="
./ops/void-mainnet-rewardengine-econ-health-all.sh || {
  echo "[ERROR] RewardEngine econ health-all failed"
  exit 1
}

echo
echo "=== [2] mainnet pillars + validators + RewardEngine econ + WorkCredits PLAN 5m health ==="
./ops/void-mainnet-pillars-with-rewardengine-econ-workcredits-health.sh || {
  echo "[ERROR] mainnet pillars+validators+RewardEngine econ+WorkCredits PLAN health wrapper failed"
  exit 1
}

echo
echo "[mainnet-rewardengine-workcredits-health-all] RESULT: OK (RewardEngine econ + WorkCredits PLAN healthy over 5m window)"
