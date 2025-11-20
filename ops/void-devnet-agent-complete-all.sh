#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO"

export RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "[agent-complete-all] repo=$REPO"
echo "[agent-complete-all] rpc_url=$RPC_URL"
echo "[agent-complete-all] NOTE: devnet-only helper."
echo "[agent-complete-all] NOTE: Stops when pending==0 OR when pending stops changing."

last_pending=""

while :; do
  echo
  echo "[agent-complete-all] polling spool-health for pending jobs..."
  OUT="$(RPC_URL="$RPC_URL" ./ops/void-devnet-spool-health.sh || true)"

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

  # If this is not the first loop and pending hasn't changed, bail out.
  if [ -n "$last_pending" ] && [ "$pending" = "$last_pending" ]; then
    echo "[agent-complete-all] pending has not changed since last iteration (pending=$pending)."
    echo "[agent-complete-all] No observable progress; exiting to avoid infinite loop."
    exit 0
  fi

  last_pending="$pending"

  # If no pending jobs, we are done.
  if [ "$pending" -eq 0 ] 2>/dev/null; then
    echo "[agent-complete-all] no pending jobs detected; done."
    exit 0
  fi

  echo "[agent-complete-all] running agent-complete-one (submit one receipt + refresh spool)..."
  RPC_URL="$RPC_URL" ./ops/void-devnet-agent-complete-one.sh

  echo "[agent-complete-all] sleep 1s before next iteration..."
  sleep 1
done
