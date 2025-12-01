#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [mainnet-pillars-with-keys] VOID mainnet pillars + keys health-all ==="

echo
echo "=== [step 0] contracts-zero guard (should still all be 0x0) ==="
./ops/void-mainnet-live-contracts-zero-guard.sh

echo
echo "=== [step 1] mainnet core health-all ==="
./ops/void-mainnet-core-health-all.sh

echo
echo "=== [step 2] mainnet lastmile health ==="
./ops/void-mainnet-lastmile-health.sh

echo
echo "=== [step 3] mainnet tokenomics health-all ==="
./ops/void-mainnet-tokenomics-health-all.sh

echo
echo "=== [step 4] mainnet pillars + keys composite view ==="
./ops/void-mainnet-pillars-keys-health.sh

echo
echo "=== [done] mainnet pillars + keys checks completed ==="
