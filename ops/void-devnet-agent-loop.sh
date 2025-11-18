#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"

cd "$REPO"

echo "[agent-loop] starting in $REPO"

while true; do
  echo "[agent-loop] sweep tick: $(date -Iseconds)"
  if ./ops/void-devnet-agent-sweep.sh; then
    echo "[agent-loop] sweep OK"
  else
    rc=$?
    echo "[agent-loop] sweep FAILED with rc=$rc" >&2
  fi
  sleep 5
done
