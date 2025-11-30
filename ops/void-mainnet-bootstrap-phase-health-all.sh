#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [mainnet-health-all] core/lastmile/tokenomics/etc ==="
./ops/void-mainnet-health-all.sh

echo
echo "=== [bootstrap-phase-health] phase=B (PLAN-ONLY) ==="
./ops/void-mainnet-bootstrap-phase-health.sh

echo
echo "[bootstrap-phase-health-all] RESULT: OK (mainnet health + phase=B/2)"
