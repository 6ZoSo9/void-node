#!/usr/bin/env bash
set -euo pipefail

cd "${REPO_ROOT:-$HOME/dev/void-node}"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [bootstrap-plan-checklist2] CONFIG_PATH=$CONFIG_PATH ==="

echo
echo "--- [1] base checklist (structure + roles/contracts/validator0) ---"
CONFIG_PATH="$CONFIG_PATH" \
  ./ops/void-mainnet-bootstrap-plan-checklist.sh || CHECK_RC=$? || CHECK_RC=0
CHECK_RC="${CHECK_RC:-0}"

echo
echo "--- [2] placeholder guard (no ADDRESS_HARDWARE_ / TODO_SET_ / VALIDATOR0_CONSENSUS_KEY) ---"
CONFIG_PATH="$CONFIG_PATH" \
  ./ops/void-mainnet-bootstrap-plan-placeholder-check.sh || PLACE_RC=$? || PLACE_RC=0
PLACE_RC="${PLACE_RC:-0}"

echo
echo "=== [bootstrap-plan-checklist2] summary ==="
echo "  base_check_rc       = $CHECK_RC"
echo "  placeholder_check_rc= $PLACE_RC"

if [ "$CHECK_RC" -ne 0 ] || [ "$PLACE_RC" -ne 0 ]; then
  echo "[bootstrap-plan-checklist2] RESULT: NOT_OK"
  exit 1
fi

echo "[bootstrap-plan-checklist2] RESULT: OK"
