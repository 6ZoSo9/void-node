#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[FATAL] $CONFIG_PATH not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required but not installed" >&2
  exit 1
fi

echo "=== [VOID mainnet PLAN summary] live.json ==="
CHAIN_ID="$(jq -r '.chainId' "$CONFIG_PATH")"
echo "chainId: ${CHAIN_ID}"
echo

echo "=== [roles] ==="
jq -r '.roles | to_entries[] | "  \(.key) : \(.value)"' "$CONFIG_PATH"
echo

echo "=== [contracts] ==="
jq -r '.contracts | to_entries[] | "  \(.key) : \(.value)"' "$CONFIG_PATH"
echo

echo "=== [validator0] ==="
jq -r '"  reward       : \(.validator0.reward)
  consensusKey : \(.validator0.consensusKey)
  stakeVOID    : \(.validator0.stakeVOID)"' "$CONFIG_PATH"
