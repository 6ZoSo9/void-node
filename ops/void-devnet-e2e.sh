#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "[e2e] step 1: devnet-up..."
./ops/void-devnet-up.sh

echo
echo "[e2e] step 2: haiku demo (single run)..."
./ops/void-devnet-haiku-demo.sh

echo
echo "[e2e] step 3: agent / metrics health..."
if [ -x ./ops/void-devnet-agent-health.sh ]; then
  ./ops/void-devnet-agent-health.sh
else
  echo "[e2e] (skip) ops/void-devnet-agent-health.sh not found"
fi

echo
echo "[e2e] OK – devnet end-to-end pipeline passed."
