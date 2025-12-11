#!/usr/bin/env bash
set -euo pipefail

# Devnet RewardEngine health-all:
# - rely on existing exporters/timers to write textfiles
# - this script is user-safe: it only reads health via the smoke wrapper

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "=== [Devnet RewardEngine + WorkCredits HEALTH-ALL] ==="

echo
echo "=== [1] devnet RewardEngine smoke] ==="
if ./ops/void-devnet-rewardengine-smoke.sh; then
  echo "[devnet-rewardengine-smoke] RESULT: OK"
else
  echo "[devnet-rewardengine-smoke] RESULT: FAILED"
  exit 1
fi

echo
echo "[devnet-rewardengine-health-all] RESULT: OK (devnet RewardEngine smoke passed; exporters assumed to be managed by timers/systemd)"
