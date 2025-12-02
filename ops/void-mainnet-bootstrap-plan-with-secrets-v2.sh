#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [mainnet-bootstrap-plan-with-secrets-v2] VOID mainnet PLAN + secrets check ==="
echo "[cfg] REPO_ROOT   = $PWD"
echo "[cfg] RPC_URL     = ${RPC_URL:-http://127.0.0.1:8545}"
echo "[cfg] CONFIG_PATH = ${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
echo "[cfg] KEY_PATH    = ${KEY_PATH:-/mnt/voidkey/meta/void-mainnet-deployer-key.hex}"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
KEY_PATH="${KEY_PATH:-/mnt/voidkey/meta/void-mainnet-deployer-key.hex}"

if ! command -v forge >/dev/null 2>&1; then
  echo "[FATAL] 'forge' not found in PATH."
  exit 1
fi

if [ -z "${VOID_MAINNET_DEPLOYER_KEY:-}" ]; then
  echo
  echo "=== [secrets] loading deployer key from $KEY_PATH ==="
  if [ ! -f "$KEY_PATH" ]; then
    echo "[FATAL] key file not found: $KEY_PATH"
    exit 1
  fi
  KEY_HEX="$(tr -d ' \t\r\n' < "$KEY_PATH")"
  if [ -z "$KEY_HEX" ]; then
    echo "[FATAL] key file is empty: $KEY_PATH"
    exit 1
  fi
  if ! echo "$KEY_HEX" | grep -Eq '^[0-9a-fA-F]{64}$'; then
    echo "[FATAL] key file does not contain a 64-hex private key."
    exit 1
  fi
  export VOID_MAINNET_DEPLOYER_KEY="0x$KEY_HEX"
  echo "[info] exported VOID_MAINNET_DEPLOYER_KEY from key file (value not shown)."
else
  echo
  echo "=== [secrets] using existing VOID_MAINNET_DEPLOYER_KEY from environment ==="
fi

echo
echo "=== [step] forge script (PLAN + secrets) ==="
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "planWithSecrets(string)" \
  "$CONFIG_PATH" \
  -vvvv

echo
echo "=== [result] PLAN + secrets check completed successfully (no broadcasts). ==="
