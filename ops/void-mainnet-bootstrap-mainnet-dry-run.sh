#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
SCRIPT_FQ="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"

cd "$ROOT"

echo "=== [mainnet-dry-run] VOID mainnet bootstrap MAINNET run() dry-run ==="
echo "[cfg] ROOT        = $ROOT"
echo "[cfg] SCRIPT_FQ   = $SCRIPT_FQ"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] RPC_URL     = $RPC_URL"
echo

echo "=== [1] chainId sanity via cast chain-id ==="
CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
echo "$CHAIN_ID"
echo

echo "=== [2] forge script run(configPath) simulation (EXPECT STUB REVERT) ==="
TMP_OUT="$(mktemp -t void-mainnet-dryrun.XXXXXX)"
STATUS=0

set +e
forge script "$SCRIPT_FQ" \
  --rpc-url "$RPC_URL" \
  --sig "run(string)" "$CONFIG_PATH" \
  -vvvv &> "$TMP_OUT"
STATUS=$?
set -e

if [ "$STATUS" -eq 0 ]; then
  echo "=== [mainnet-dry-run] ERROR: forge script unexpectedly succeeded (we expect stub-only revert)"
  echo "status=$STATUS"
  echo "tmpout=$TMP_OUT"
  exit 1
fi

if grep -q 'RUN_STUB_ONLY' "$TMP_OUT"; then
  echo "=== [mainnet-dry-run] OK: saw expected RUN_STUB_ONLY stub-only revert"
  echo "tmpout=$TMP_OUT"
  exit 0
else
  echo "=== [mainnet-dry-run] ERROR: script failed but missing RUN_STUB_ONLY marker"
  echo "status=$STATUS"
  echo "tmpout=$TMP_OUT"
  exit 1
fi
