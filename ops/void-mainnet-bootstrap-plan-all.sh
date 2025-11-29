#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"

echo "=== [mainnet-bootstrap-plan-all] VOID mainnet bootstrap PLAN full check ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo

cd "$REPO_ROOT"

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
  echo "[ERROR] plan-view script failed (unexpected; not just NOT_READY)."
  exit 1
}
echo

echo "=== [2] PLAN structural health (PromQL) ==="
if ./ops/void-mainnet-bootstrap-plan-health-all.sh; then
  :
else
  echo
  echo "[INFO] plan-health-all exited non-zero (likely NOT_READY, which is expected"
  echo "       until real roles/contracts/validator0 are filled in)."
fi
echo

echo "=== [3] PLAN forge sim (stub) ==="
./ops/void-mainnet-bootstrap-mainnet-plan-sim.sh || {
  echo
  echo "[ERROR] plan-sim script failed (unexpected; stub revert should be handled inside)."
  exit 1
}
echo

echo "=== [mainnet-bootstrap-plan-all] DONE (see above for NOT_READY vs READY details) ==="
