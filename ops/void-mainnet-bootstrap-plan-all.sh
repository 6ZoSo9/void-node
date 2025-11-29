#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"

echo "=== [mainnet-bootstrap-plan-all] VOID mainnet bootstrap PLAN full check ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo

cd "$REPO_ROOT"

# 0) Quick presence check for the key scripts so we fail loudly if something is missing.
for f in \
  ops/void-mainnet-bootstrap-plan-checklist.sh \
  ops/void-mainnet-bootstrap-plan-view.sh \
  ops/void-mainnet-bootstrap-plan-health-all.sh \
  ops/void-mainnet-bootstrap-mainnet-plan-sim.sh
do
  if [ ! -x "$f" ]; then
    echo "[FATAL] missing or non-executable: $f" >&2
    exit 1
  fi
done

echo "=== [0] PLAN checklist ==="
./ops/void-mainnet-bootstrap-plan-checklist.sh || {
  echo
  echo "[ERROR] checklist script failed (unexpected)."
  echo "        Fix that before trusting the PLAN lane."
  exit 1
}
echo

echo "=== [1] PLAN structural view ==="
./ops/void-mainnet-bootstrap-plan-view.sh || {
  echo
  echo "[ERROR] plan-view script failed (unexpected)."
  exit 1
}
echo

echo "=== [2] PLAN structural health (PromQL) ==="
./ops/void-mainnet-bootstrap-plan-health-all.sh || {
  echo
  echo "[ERROR] plan-health-all script failed (unexpected)."
  exit 1
}
echo

echo "=== [3] PLAN simulation via forge script (stub) ==="
./ops/void-mainnet-bootstrap-mainnet-plan-sim.sh || {
  echo
  echo "[ERROR] plan-sim script failed (unexpected)."
  echo "        If this isn't just the stub revert, investigate."
  exit 1
}
echo

echo "=== [4] summary ==="
echo "  - Checklist      : ran OK"
echo "  - PLAN view      : printed current live.json roles/contracts/validator0"
echo "  - PLAN health    : see output above (currently expected = NOT_READY / 0)"
echo "  - PLAN sim (stub): parsed config + reverted with stub marker"
echo
echo "NOTE:"
echo "  This hammer is considered SUCCESS as long as the scripts themselves run clean."
echo "  It does NOT require PLAN health == 1 yet; that only happens once real"
echo "  mainnet roles/contracts/validator0 are filled in and we're truly ready."
echo
echo "=== [mainnet-bootstrap-plan-all] done ==="
