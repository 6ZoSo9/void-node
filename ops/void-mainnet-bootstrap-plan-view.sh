#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO_ROOT"

echo "=== [mainnet-bootstrap-plan-view] VOID mainnet PLAN view (read-only) ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] RPC_URL     = $RPC_URL"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "[FATAL] forge not found in PATH." >&2
  exit 1
fi

echo "=== [0] running forge script (NO BROADCAST) ==="
forge script \
  script/VoidMainnetBootstrapPlanView.s.sol:VoidMainnetBootstrapPlanView \
  --sig "run(string)" "$CONFIG_PATH" \
  --rpc-url "$RPC_URL"

echo
echo "=== [mainnet-bootstrap-plan-view] DONE ==="
