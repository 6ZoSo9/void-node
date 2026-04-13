#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

echo "=== [void-mainnet-pillars-preflight] stub bootstrap plan gate ==="
sudo bash ops/void-mainnet-stub-plan-preflight.sh

echo
echo "=== [void-mainnet-pillars-preflight] delegate to generic pillars preflight ==="
# Back-compat alias: old name -> current preflight gate
exec bash ops/void-pillars-preflight.sh
