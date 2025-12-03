#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "=== [mainnet-health-with-mainnet-all] VOID mainnet overall health (base + MAINNET bootstrap) ==="
echo "[cfg] ROOT = $ROOT"
echo

base_ok=0
with_mainnet_ok=0

echo "=== [1] base mainnet pillars ==="
if ./ops/void-mainnet-health-all.sh; then
  base_ok=1
else
  echo "[warn] base mainnet pillars health failed"
fi

echo
echo "=== [2] planning+keys+MAINNET bootstrap pillars ==="
if ./ops/void-mainnet-planning-with-mainnet-health-all.sh; then
  with_mainnet_ok=1
else
  echo "[warn] planning+keys+MAINNET bootstrap health failed"
fi

echo
echo "=== [summary] ==="
echo "[summary] base_ok         = $base_ok"
echo "[summary] with_mainnet_ok = $with_mainnet_ok"

if [ "$base_ok" -eq 1 ] && [ "$with_mainnet_ok" -eq 1 ]; then
  echo "[overall] RESULT: OK (base pillars + planning+keys+MAINNET all healthy)"
  exit 0
else
  echo "[overall] RESULT: FAIL (see sections above)"
  exit 1
fi
