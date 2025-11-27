#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="${1:-ops/mainnet-bootstrap-addresses.mainnet.example.json}"

echo "[diag] config file: $CFG"
echo "[diag] anvil binary:"
command -v anvil || { echo "[diag] ERROR: anvil not found in PATH" >&2; exit 1; }

ANVIL_PORT=8547

echo "[diag] killing any old anvil on port ${ANVIL_PORT}..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${ANVIL_PORT}/tcp" 2>/dev/null || true
else
  pkill -f "anvil.*${ANVIL_PORT}" 2>/dev/null || true
fi

echo "[diag] starting anvil (chainId=2050, port=${ANVIL_PORT})..."
anvil --chain-id 2050 --port "${ANVIL_PORT}" >/tmp/void-mainnet-bootstrap-mainnet-anvil.log 2>&1 &
ANVIL_PID=$!
echo "[diag] anvil pid: ${ANVIL_PID}"

echo "[diag] waiting for 127.0.0.1:${ANVIL_PORT} to accept TCP..."
for i in {1..50}; do
  if bash -c ">/dev/tcp/127.0.0.1/${ANVIL_PORT}" 2>/dev/null; then
    echo "[diag] anvil is UP on 127.0.0.1:${ANVIL_PORT}"
    break
  fi
  sleep 0.1
done

if ! bash -c ">/dev/tcp/127.0.0.1/${ANVIL_PORT}" 2>/dev/null; then
  echo "[diag] FATAL: anvil failed to come up on ${ANVIL_PORT}; last 80 lines of log:" >&2
  echo "----------------------------------------------------------------" >&2
  tail -n 80 /tmp/void-mainnet-bootstrap-mainnet-anvil.log >&2 || true
  echo "----------------------------------------------------------------" >&2
  kill "${ANVIL_PID}" 2>/dev/null || true
  exit 1
fi

echo "[diag] running forge script (no broadcast, default run(); config via env)..."
export VOID_MAINNET_BOOTSTRAP_CONFIG="${CFG}"

set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "http://127.0.0.1:${ANVIL_PORT}"
STATUS=$?
set -e

echo "[diag] forge script exit code: ${STATUS} (non-zero is EXPECTED for bad configs; =0 means all guards passed)"

echo "[diag] stopping anvil..."
kill "${ANVIL_PID}" 2>/dev/null || true
echo "[diag] done."

exit "${STATUS}"
