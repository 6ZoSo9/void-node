#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO"

if [ ! -x "$HOME/.local/bin/void-devnet-manifest-run.sh" ]; then
  echo "[ERR] missing void-devnet-manifest-run.sh in ~/.local/bin" >&2
  exit 1
fi

PROMPT="${*:-demo: write a haiku about Void devnet (demo)}"

echo "[demo] repo=$REPO"
echo "[demo] RPC_URL=$RPC_URL"
echo "[demo] prompt=\"$PROMPT\""
echo

RPC_URL="$RPC_URL" "$HOME/.local/bin/void-devnet-manifest-run.sh" "$PROMPT"
