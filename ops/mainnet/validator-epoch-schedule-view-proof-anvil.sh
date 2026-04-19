#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ANVIL_PORT="${ANVIL_PORT:-9985}"
ANVIL_LOG="${ANVIL_LOG:-/tmp/anvil.validator-epoch-schedule-view.$(date +%Y%m%d-%H%M%S).log}"
RPC_URL="http://127.0.0.1:${ANVIL_PORT}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

echo "=== [1] start disposable anvil on ${RPC_URL} ==="
if ss -ltn | awk '{print $4}' | grep -Eq "[:.]${ANVIL_PORT}$"; then
  echo "[ERR] port ${ANVIL_PORT} already in use"
  exit 1
fi

nohup anvil --host 127.0.0.1 --port "${ANVIL_PORT}" >"$ANVIL_LOG" 2>&1 &
ANVIL_PID=$!

cleanup() {
  if kill -0 "$ANVIL_PID" 2>/dev/null; then
    kill "$ANVIL_PID" 2>/dev/null || true
    wait "$ANVIL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

echo
echo "=== [2] rpc truth ==="
cast chain-id --rpc-url "$RPC_URL"
echo "log=$ANVIL_LOG"

echo
echo "=== [3] run guarded epoch schedule view proof ==="
RPC_URL="$RPC_URL" \
CHAIN_ID_EXPECTED=31337 \
PRIVATE_KEY="$PRIVATE_KEY" \
bash ops/mainnet/validator-epoch-schedule-view-local-proof.sh

echo
echo "=== [4] done ==="
echo "[ok] validator epoch schedule view guarded proof completed on disposable anvil"
