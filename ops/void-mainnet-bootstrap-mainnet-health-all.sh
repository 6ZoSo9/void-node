#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [mainnet-mainnet-health-all] VOID mainnet MAINNET bootstrap health ==="

overall=1

echo
echo "=== [1] keys pillar ==="
if ./ops/void-mainnet-keys-health.sh; then
  echo "[keys] OK"
else
  echo "[keys] ERROR"
  overall=0
fi

echo
echo "=== [2] PLAN pillar ==="
if ./ops/void-mainnet-bootstrap-plan-health-all.sh; then
  echo "[plan] OK"
else
  echo "[plan] ERROR"
  overall=0
fi

echo
echo "=== [3] run() dry-run harness ==="
if ./ops/void-mainnet-bootstrap-mainnet-dry-run.sh; then
  echo "[run-dry-run] OK"
else
  echo "[run-dry-run] ERROR"
  overall=0
fi

echo
echo "=== [summary] ==="
if [ "$overall" -eq 1 ]; then
  echo "[summary] RESULT: OK (keys + PLAN + run() dry-run healthy)"
  exit 0
else
  echo "[summary] RESULT: ERROR (one or more checks failed; see sections above)"
  exit 1
fi
