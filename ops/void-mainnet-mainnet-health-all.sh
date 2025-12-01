#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [mainnet-mainnet-health-all] VOID mainnet MAINNET health-all ==="

echo
echo "=== [A] contracts-zero guard (LIVE JSON must still be 0x0 pre-deploy) ==="
./ops/void-mainnet-live-contracts-zero-guard.sh

echo
echo "=== [B] bootstrap MAINNET health-all (keys + PLAN + run() dry-run) ==="
./ops/void-mainnet-bootstrap-mainnet-health-all.sh

echo
echo "=== [C] pillars + keys health-all (core + lastmile + tokenomics + keys) ==="
./ops/void-mainnet-pillars-with-keys-health-all.sh

echo
echo "=== [summary] mainnet MAINNET health-all completed ==="
echo "  - LIVE .contracts.* still zero-address"
echo "  - keys + PLAN + run() dry-run healthy"
echo "  - mainnet core/lastmile/tokenomics pillars healthy"
echo "  - pillars AND keys roles healthy over last 5m"
