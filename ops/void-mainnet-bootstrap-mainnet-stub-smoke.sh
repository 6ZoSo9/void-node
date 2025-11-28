#!/usr/bin/env bash
set -euo pipefail

echo "=== [mainnet-bootstrap-stub] VOID mainnet stub smoke ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Default template path for now; can be overridden by first arg.
CONFIG_DEFAULT="config/void-mainnet-bootstrap-mainnet.template.json"
CONFIG_PATH="${1:-$CONFIG_DEFAULT}"

echo "[info] REPO_ROOT   = $REPO_ROOT"
echo "[info] RPC_URL     = $RPC_URL"
echo "[info] CONFIG_PATH = $CONFIG_PATH"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[warn] CONFIG_PATH does not exist yet; nothing to smoke-test."
  echo "[warn] When you create $CONFIG_PATH for real, rerun this script."
  exit 0
fi

echo
echo "[step 1] forge script dry-run (expect revert from stub)..."
set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "run(string)" \
  "$CONFIG_PATH"
RC=$?
set -e

echo "[step 1] forge script exit code = $RC"

# For a pure stub that always reverts, we *expect* non-zero.
# If/when we later remove the revert for real mainnet wiring, this guard will change.
if [ "$RC" -eq 0 ]; then
  echo "[ERROR] expected non-zero exit (revert) from stub, but got rc=0"
  exit 1
fi

echo
echo "[result] OK – stub ran and reverted as expected."
echo "         (When we implement the real mainnet wiring, this script will be updated.)"
