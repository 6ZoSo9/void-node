#!/usr/bin/env bash
set -euo pipefail

# Simple simulate harness for VOID mainnet bootstrap.
# - Uses the same Forge script as the stub-smoke.
# - Always runs in dry-run mode (no --broadcast).
# - Uses the live mainnet config by default.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-bootstrap-sim] VOID mainnet bootstrap SIMULATE ==="
echo "[info] REPO_ROOT   = ${REPO_ROOT}"
echo "[info] RPC_URL     = ${RPC_URL}"
echo "[info] CONFIG_PATH = ${CONFIG_PATH}"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "[error] config file not found: ${CONFIG_PATH}" >&2
  exit 1
fi

echo
echo "[step 1] forge script dry-run (no broadcast)..."

set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "${RPC_URL}" \
  --sig "run(string)" "${CONFIG_PATH}"
rc=$?
set -e

echo
echo "[step 1] forge script exit code = ${rc}"

if [[ ${rc} -ne 0 ]]; then
  echo
  echo "[result] WARN – simulate run failed (this is expected while the script is still a STUB)."
  echo "         When we implement real wiring and align the script with the PLAN,"
  echo "         this harness should complete without revert for a valid config."
  exit ${rc}
fi

echo
echo "[result] OK – simulate run completed without revert."
