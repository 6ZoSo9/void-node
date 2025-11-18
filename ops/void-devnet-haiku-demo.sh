#!/usr/bin/env bash
set -euo pipefail

# Simple demo wrapper around void-devnet-manifest-run.sh
# Usage:
#   ./ops/void-devnet-haiku-demo.sh
#   ./ops/void-devnet-haiku-demo.sh "demo: custom prompt here"

REPO="${REPO:-$HOME/dev/void-node}"
if [ ! -d "$REPO" ]; then
  echo "[ERR] repo not found: $REPO" >&2
  exit 1
fi

cd "$REPO"

# Load devnet agent env if present
AGENT_ENV="$HOME/.config/void/devnet-agent.env"
if [ -f "$AGENT_ENV" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$AGENT_ENV"
  set +a
fi

# Defaults (safe for devnet only)
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"

if [ -z "$DEVNET_PRIVKEY" ]; then
  echo "[ERR] DEVNET_PRIVKEY is not set."
  echo "      Set it in $AGENT_ENV or export it in your shell."
  exit 1
fi

PROMPT=${1:-"demo: write a haiku about Void devnet demo"}

echo "[demo] repo=$REPO"
echo "[demo] RPC_URL=$RPC_URL"
echo "[demo] prompt=\"$PROMPT\""
echo

# Run full pipeline: manifest -> job -> sweep -> coverage -> inspect
RPC_URL="$RPC_URL" DEVNET_PRIVKEY="$DEVNET_PRIVKEY" \
  ~/.local/bin/void-devnet-manifest-run.sh "$PROMPT"

echo
echo "[demo] tail coverage:"
sed -n '1,20p' "$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom" || echo "[warn] no coverage file?"

echo
echo "[demo] tail manifest index:"
sed -n '1,40p' docs/VOID-DEVNET-MANIFEST-INDEX.txt || echo "[warn] no manifest index?"
