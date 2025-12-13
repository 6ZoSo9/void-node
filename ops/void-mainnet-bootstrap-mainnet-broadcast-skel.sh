#!/usr/bin/env bash
set -euo pipefail

# Skeleton MAINNET bootstrap broadcast script.
# IMPORTANT: This does NOT broadcast anything yet.
# It only runs the existing stub run() path and prints a summary.

ROOT="${ROOT:-$(pwd)}"
cd "$ROOT"

SCRIPT_FQ="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"
CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-bootstrap-broadcast-skel] VOID mainnet MAINNET broadcast skeleton ==="
echo "[info] ROOT        = $ROOT"
echo "[info] SCRIPT_FQ   = $SCRIPT_FQ"
echo "[info] CONFIG_PATH = $CONFIG_PATH"
echo "[info] RPC_URL     = $RPC_URL"
echo
echo ">>> WARNING"
echo "    This is a STUB-ONLY mainnet bootstrap broadcast script."
echo "    It DOES NOT send any real transactions."
echo "    It only runs the existing stub run() path and exits."
echo

echo "=== [1] chainId sanity via cast chain-id ==="
CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")" || {
  echo "[fatal] failed to read chainId from $RPC_URL" >&2
  exit 1
}
echo "[info] chainId = $CHAIN_ID"
echo

echo "=== [2] forge script simulation (NO BROADCAST, EXPECT STUB REVERT) ==="
set +e
forge script "$SCRIPT_FQ" \
  --sig "run(string)" "$CONFIG_PATH" \
  --rpc-url "$RPC_URL"
RC=$?
set -e

echo
if [[ $RC -ne 0 ]]; then
  echo "[info] forge script exited with rc=$RC (expected while RUN_STUB_ONLY is in place)"
else
  echo "[warn] forge script exited with rc=$RC (unexpected success while stub-only revert is expected)"
fi

echo
echo "=== [summary] ==="
echo "[summary] Script wired: ROOT=$ROOT, CONFIG_PATH=$CONFIG_PATH, RPC_URL=$RPC_URL"
echo "[summary] No mainnet transactions were broadcast."
echo "[summary] When we are ready for REAL mainnet bootstrap we will:"
echo "  - introduce a hard sentinel gate (e.g. /mnt/voidkey/allow-mainnet-broadcast.ok)"
echo "  - require explicit flags/env before allowing any broadcast"
echo "  - replace the RUN_STUB_ONLY guard in the Solidity script."
