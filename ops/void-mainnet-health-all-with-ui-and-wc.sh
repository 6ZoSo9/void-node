#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [mainnet-health-all-with-ui-and-wc] VOID mainnet health (core + UI + Work Credits) ==="

echo
echo "=== [1] core + lastmile + safeboot + pillars + UI ==="
./ops/void-mainnet-health-all-with-ui.sh

echo
echo "=== [2] Work Credits pillar health (tests + PLAN) ==="
./ops/void-mainnet-work-credits-health-all.sh

echo
echo "=== [3] summary ==="
echo "  - core/mainnet pillars + UI : OK (see step [1])"
echo "  - Work Credits pillar       : OK (see step [2])"

echo
echo "[mainnet-health-all-with-ui-and-wc] RESULT: OK (core + UI + Work Credits)"
