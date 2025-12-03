#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== [mainnet-mainnet-health-all] VOID mainnet MAINNET bootstrap health ==="
echo "[cfg] ROOT = $ROOT"
echo

keys_ok=0
plan_ok=0
run_ok=0

echo "=== [1] keys pillar ==="
if ./ops/void-mainnet-keys-health.sh; then
  keys_ok=1
else
  echo "[warn] keys pillar failed"
fi

echo
echo "=== [2] PLAN pillar ==="
if ./ops/void-mainnet-plan-health-all.sh; then
  plan_ok=1
else
  echo "[warn] PLAN pillar failed"
fi

echo
echo "=== [3] run() dry-run harness ==="
if ./ops/void-mainnet-mainnet-dry-run.sh; then
  run_ok=1
else
  echo "[warn] run() dry-run failed"
fi

echo
echo "=== [summary] ==="
echo "[summary] keys_ok = $keys_ok"
echo "[summary] plan_ok = $plan_ok"
echo "[summary] run_ok  = $run_ok"

if [ "$keys_ok" -eq 1 ] && [ "$plan_ok" -eq 1 ] && [ "$run_ok" -eq 1 ]; then
  echo "[mainnet-mainnet-bootstrap] OK"
  exit 0
else
  echo "[mainnet-mainnet-bootstrap] FAILED"
  exit 1
fi
