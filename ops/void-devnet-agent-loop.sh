#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

# require the devnet key in env (same as all our other devnet scripts)
: "${DEVNET_PRIVKEY:?set DEVNET_PRIVKEY}"

SLEEP_SEC="${SLEEP_SEC:-10}"

echo "[agent-loop] starting devnet agent loop"
echo "             SLEEP_SEC = ${SLEEP_SEC}"
echo "             using DEVNET_PRIVKEY from env"
echo

trap 'echo "[agent-loop] caught SIGINT, exiting"; exit 0' INT

i=0
while true; do
  i=$((i+1))
  echo
  echo "===== [agent-loop] iteration ${i} ====="
  date

  # One full cycle:
  #  - post a job (void-devnet-postjob-demo.sh)
  #  - agent one-shot submits a receipt for that job
  #  - receipts exporter refreshes metrics
  #  - we print Prom derived metrics
  if ! void-devnet-job-receipt-cycle.sh; then
    echo "[agent-loop][WARN] cycle failed (iteration ${i}), sleeping then retrying..." >&2
  fi

  echo "[agent-loop] sleeping ${SLEEP_SEC}s before next iteration..."
  sleep "${SLEEP_SEC}"
done
