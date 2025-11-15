#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (…/void-node)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[stack] repo:    $REPO_ROOT"
echo "[stack] RPC_URL: $RPC_URL"

# Quick reachability check (soft warning)
if ! curl -fsS --max-time 1 "$RPC_URL" >/dev/null 2>&1; then
  echo "[stack][WARN] $RPC_URL not reachable; did you start anvil/devnet?" >&2
fi

echo "[stack] 1/3 forge test…"
forge test

echo "[stack] 2/3 void-devnet-deploy…"
: "${DEVNET_PRIVKEY:?DEVNET_PRIVKEY env var must be set to a dev-only key}"
RPC_URL="$RPC_URL" ./ops/void-devnet-deploy.sh

echo "[stack] 3/3 void-devnet-verify…"
RPC_URL="$RPC_URL" ./ops/void-devnet-verify.sh

echo "[stack] DONE – tests + deploy + premine verify OK."
echo "[stack] Current devnet addresses:"
cat docs/VOID-DEVNET-DEPLOY-ADDRESSES.json
