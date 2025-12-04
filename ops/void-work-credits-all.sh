#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [wc+relayers+pillars] aggregate summary ==="
echo

./ops/void-mainnet-pillars-keys-ai-wc-relayers-summary.sh
echo
./ops/void-work-credits-summary.sh
echo
./ops/void-relayers-summary.sh

echo
echo "=== [wc+relayers+pillars] done ==="
