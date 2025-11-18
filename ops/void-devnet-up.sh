#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[up] repo=$REPO"
echo "[up] RPC_URL=$RPC_URL"

if [ ! -d "$REPO" ]; then
  echo "[up][ERR] repo dir not found: $REPO" >&2
  exit 1
fi

cd "$REPO"

if ! command -v cast >/dev/null 2>&1; then
  echo "[up][ERR] foundry 'cast' CLI not in PATH" >&2
  exit 1
fi

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[up][ERR] DEVNET_PRIVKEY not set in environment" >&2
  echo "      export DEVNET_PRIVKEY='0x...'" >&2
  exit 1
fi

echo
echo "[up] step 0: sanity check RPC + chainId..."
CHAIN_ID=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "?")
echo "[up] chainId=$CHAIN_ID (expected 2050)"

if [ "$CHAIN_ID" != "2050" ]; then
  echo "[up][WARN] chainId is not 2050 – are you sure devnet is running?" >&2
fi

echo
echo "[up] step 1: deploy/update system contracts..."
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="$DEVNET_PRIVKEY" ./ops/void-devnet-system-deploy.sh

echo
echo "[up] step 2: run a self-check haiku job..."
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="$DEVNET_PRIVKEY" \
  ./ops/void-devnet-haiku-demo.sh "boot-check: VOID devnet up script haiku"

echo
echo "[up] step 3: status snapshot..."
./ops/void-devnet-status.sh

echo
echo "[up] step 4: agent coverage health..."
./ops/void-devnet-agent-health.sh || {
  echo "[up][ERR] agent health failed (coverage != 1)" >&2
  exit 1
}

echo
echo "[up] step 5: devnet state snapshot..."
./ops/void-devnet-snap.sh

echo
echo "[up] DONE: VOID devnet up script finished successfully."
