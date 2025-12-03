#!/usr/bin/env bash
set -euo pipefail

ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
SCRIPT_FQ="${SCRIPT_FQ:-script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-dry-run] VOID mainnet bootstrap MAINNET run() dry-run ==="
echo "[cfg] ROOT        = $ROOT"
echo "[cfg] SCRIPT_FQ   = $SCRIPT_FQ"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] RPC_URL     = $RPC_URL"
echo

cd "$ROOT"

echo "=== [1] chainId sanity via cast chain-id ==="
if ! chain_id="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null)"; then
  echo "[mainnet-dry-run] ERROR: cast chain-id failed (RPC down or wrong chain?)"
  exit 1
fi
echo "$chain_id"
echo

echo "=== [2] forge script run(configPath) simulation (EXPECT STUB REVERT) ==="

tmpout="$(mktemp /tmp/void-mainnet-dryrun.XXXXXX)"

# We expect this to REVERT with marker 'RUN_STUB_ONLY'
# Use tee so logs go both to stdout and tmpout.
set +e
forge script "$SCRIPT_FQ" \
  --rpc-url "$RPC_URL" \
  --sig "run(string)" \
  "$CONFIG_PATH" \
  --broadcast 2>&1 | tee "$tmpout"
status="$?"
set -e

if [[ "$status" -eq 0 ]]; then
  echo
  echo "[run-dry-run] ERROR: forge script succeeded unexpectedly (no revert)."
  echo "[run-dry-run] tmpout=$tmpout"
  exit 1
fi

if grep -q "RUN_STUB_ONLY" "$tmpout"; then
  echo
  echo "[run-dry-run] OK: saw expected stub-only revert marker: RUN_STUB_ONLY"
  echo "[run-dry-run] tmpout=$tmpout"
  exit 0
else
  echo
  echo "[run-dry-run] ERROR: script failed but missing RUN_STUB_ONLY marker"
  echo "[run-dry-run] exit_status=$status"
  echo "[run-dry-run] tmpout=$tmpout"
  exit 1
fi
