#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="\${PROM_URL:-http://127.0.0.1:9090}"

echo "[reward-health] repo=$(pwd)"
echo "[reward-health] prom_url=\$PROM_URL"

run_tokenomics_health() {
  if ./ops/void-mainnet-tokenomics-health-all.sh; then
    echo "[reward-health] tokenomics health-all OK"
  else
    echo "[reward-health] tokenomics health-all FAILED"
    return 1
  fi
}

run_tokenomics_health

echo "[reward-health] RESULT: OK (reward health piggybacks tokenomics health for now)"
