#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

echo "=== [pillars-preflight] VOID mainnet pillars preflight ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"

if ./ops/void-mainnet-pillars-health-all.sh; then
  echo
  echo "[pillars-preflight] RESULT: OK (safeboot + devnet + mainnet-core + manifest + keys + plan + run + lastmile + validators all healthy)"
  exit 0
else
  STATUS=$?
  echo
  echo "[pillars-preflight] RESULT: FAILED (see ops/void-mainnet-pillars-health-all.sh output above)"
  exit "$STATUS"
fi
