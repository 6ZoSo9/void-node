#!/usr/bin/env bash
set -euo pipefail

cd "${REPO_ROOT:-$HOME/dev/void-node}"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [bootstrap-plan-placeholder-check] CONFIG_PATH=$CONFIG_PATH ==="

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[placeholders] ERROR: config file not found: $CONFIG_PATH" >&2
  exit 1
fi

# Strings that must NEVER appear in a real mainnet .live.json
PATTERN='ADDRESS_HARDWARE_|TODO_SET_|VALIDATOR0_CONSENSUS_KEY'

if grep -nE "$PATTERN" "$CONFIG_PATH" >/dev/null 2>&1; then
  echo "[placeholders] FOUND placeholder markers in $CONFIG_PATH:"
  grep -nE "$PATTERN" "$CONFIG_PATH" || true
  echo "[placeholders] RESULT: NOT_OK (config still has placeholders)"
  exit 1
fi

echo "[placeholders] no placeholder markers found in $CONFIG_PATH"
echo "[placeholders] RESULT: OK"
