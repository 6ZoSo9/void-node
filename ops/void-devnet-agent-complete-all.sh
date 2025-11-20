#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

export RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[agent-complete-all] repo=$REPO"
echo "[agent-complete-all] rpc_url=$RPC_URL"

while :; do
  echo
  echo "[agent-complete-all] polling spool-health for pending jobs..."
  # Capture output of spool-health; it already runs the worker and prints a summary line
  OUT="$(RPC_URL="$RPC_URL" ./ops/void-devnet-spool-health.sh || true)"

  # Try to extract 'pending=N' from the summary line
  pending="$(printf '%s\n' "$OUT" \
    | awk '/summary:/{for(i=1;i<=NF;i++){if($i ~ /pending=/){gsub("pending=","",$i); print $i}}}' \
    | head -n1)"

  if [ -z "${pending:-}" ]; then
    echo "[agent-complete-all] WARN: could not parse pending count from spool-health output."
    echo "[agent-complete-all] Raw summary snippet:"
    printf '%s\n' "$OUT" | sed -n '1,40p'
    exit 1
  fi

  echo "[agent-complete-all] pending=$pending"

  if [ "$pending" -eq 0 ] 2>/dev/null; then
    echo "[agent-complete-all] no pending jobs detected; done."
    exit 0
  fi

  echo "[agent-complete-all] running agent-complete-one (will submit a receipt + refresh spool)..."
  RPC_URL="$RPC_URL" ./ops/void-devnet-agent-complete-one.sh

  echo "[agent-complete-all] sleep 1s before next iteration..."
  sleep 1
done
