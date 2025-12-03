#!/usr/bin/env bash
set -euo pipefail

ROOT="${REPO_ROOT:-$HOME/dev/void-node}"

echo "=== [mainnet-mainnet-health-all] VOID mainnet MAINNET bootstrap health ==="
echo "[cfg] ROOT = $ROOT"
echo

cd "$ROOT"

echo "=== [1] keys pillar ==="
keys_ok=0
if ./ops/void-mainnet-keys-health-all.sh; then
  keys_ok=0
else
  keys_ok=$?
fi
echo

echo "=== [2] PLAN pillar ==="
plan_ok=0
if ./ops/void-mainnet-plan-health-all.sh; then
  plan_ok=0
else
  plan_ok=$?
fi
echo

echo "=== [3] run() dry-run harness ==="
run_ok=0
if ./ops/void-mainnet-mainnet-dry-run.sh; then
  run_ok=0
else
  run_ok=$?
fi
echo

echo "=== [summary] ==="
echo "[summary] keys_ok = $keys_ok"
echo "[summary] plan_ok = $plan_ok"
echo "[summary] run_ok  = $run_ok"

if [[ "$keys_ok" -eq 0 && "$plan_ok" -eq 0 && "$run_ok" -eq 0 ]]; then
  echo "[mainnet-mainnet-bootstrap] OK"
  exit 0
else
  echo "[mainnet-mainnet-bootstrap] ERROR"
  exit 1
fi
