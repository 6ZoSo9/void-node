#!/usr/bin/env bash
set -euo pipefail

REPO=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[devnet-full] repo:    $REPO"
echo "[devnet-full] RPC_URL: $RPC_URL"
echo "[devnet-full] DEVNET_PRIVKEY: ${DEVNET_PRIVKEY:+<set>}"

echo "[devnet-full] 1/4 void-devnet-stack (tests + deploy + premine verify)…"
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}" \
  ./ops/void-devnet-stack.sh

echo "[devnet-full] 2/4 void-devnet-bootstrap-protocol (snapshot)…"
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}" \
  ./ops/void-devnet-bootstrap-protocol.sh

echo "[devnet-full] 3/4 void-devnet-protocol-verify (snapshot vs live)…"
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}" \
  ./ops/void-devnet-protocol-verify.sh

echo "[devnet-full] 4/4 void-devnet-system-bootstrap (AdminGate masterKey)…"
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}" \
  ./ops/void-devnet-system-bootstrap.sh

echo "[devnet-full] DONE – tests + deploy + protocol snapshot + system bootstrap OK."
