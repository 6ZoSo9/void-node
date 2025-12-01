#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

overall=0

echo "[pre-push] === step: mainnet MAINNET bootstrap health-all ==="
if ./ops/void-mainnet-bootstrap-mainnet-health-all.sh; then
  echo "[mainnet-mainnet-bootstrap] DONE"
else
  echo "[mainnet-mainnet-bootstrap] ERROR"
  echo "[pre-push] RESULT: ERROR (mainnet MAINNET bootstrap health failed)"
  exit 1
fi

echo
echo "[pre-push] === step: pillars-preflight ==="
if [ -x ./ops/void-pillars-preflight.sh ]; then
  if ./ops/void-pillars-preflight.sh; then
    echo "[pillars-preflight] DONE"
  else
    echo "[pillars-preflight] ERROR"
    echo "[pre-push] RESULT: ERROR (pillars-preflight failed)"
    exit 1
  fi
else
  echo "[pillars-preflight] FATAL: ./ops/void-pillars-preflight.sh not found or not executable"
  echo "[pre-push] RESULT: ERROR (missing pillars-preflight script)"
  exit 1
fi

echo
echo "[pre-push] RESULT: OK (gates passed)"
