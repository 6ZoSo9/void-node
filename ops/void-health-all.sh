#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

echo "=== [VOID – global health hammer] ==="
echo "# Runs safeboot, devnet, and mainnet health hammers if present."
echo

overall_rc=0

run_check() {
  local name="$1"
  local script="$2"

  echo
  echo "=== [$name] ==="
  if [ -x "$script" ]; then
    if "$script"; then
      echo "[$name] OK"
    else
      echo "[$name] BAD (non-zero exit)"
      overall_rc=1
    fi
  else
    echo "[$name] SKIP (script not found or not executable: $script)"
  fi
}

run_check "safeboot" "./ops/void-safeboot-health-all.sh"
run_check "devnet"  "./ops/void-devnet-health-all.sh"
run_check "mainnet" "./ops/void-mainnet-health-all.sh"

echo
if [ "$overall_rc" -eq 0 ]; then
  echo "[RESULT] ALL GOOD (no failing environments)"
else
  echo "[RESULT] SOME BAD (at least one health hammer failed)"
fi

exit "$overall_rc"
