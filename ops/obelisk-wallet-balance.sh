#!/usr/bin/env bash
set -euo pipefail

# Obelisk Wallet balance inspector (legacy front door).
# This is just a thin wrapper around the v2 script so humans can
# type the shorter name and still get the fixed behavior.

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Delegate everything (flags, args) to v2.
exec RPC_URL="$RPC_URL" ops/obelisk-wallet-balance-v2.sh "$@"
