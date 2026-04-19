#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ANVIL_PORT="${ANVIL_PORT:-10025}"
ANVIL_LOG="${ANVIL_LOG:-/tmp/anvil.validator-epoch-manifest-export.$(date +%Y%m%d-%H%M%S).log}"
RPC_URL="http://127.0.0.1:${ANVIL_PORT}"
OUT_DIR="${OUT_DIR:-/tmp/validator-epoch-manifest-export-proof.$(date +%Y%m%d-%H%M%S)}"
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
echo "=== [3] run guarded manifest export proof ==="
RPC_URL="$RPC_URL" \
CHAIN_ID_EXPECTED=31337 \
PRIVATE_KEY="$PRIVATE_KEY" \
OUT_DIR="$OUT_DIR" \
bash ops/mainnet/validator-epoch-manifest-export-local-proof.sh

echo
echo "=== [4] artifact preview ==="
for f in "$OUT_DIR"/epoch-*.manifest.json; do
  echo "--- $f"
  sed -n '1,80p' "$f"
  echo
done

echo
echo "=== [5] done ==="
echo "[ok] validator epoch manifest export proof completed on disposable anvil"
echo "out_dir=$OUT_DIR"
