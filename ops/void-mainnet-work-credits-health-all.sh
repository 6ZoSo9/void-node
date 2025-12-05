#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [work-credits-health-all] VOID mainnet Work Credits pillar ==="

echo
echo "=== [1] dev Work Credits test suite ==="
./ops/dev-work-credits-health.sh

echo
echo "=== [2] Work Credits PLAN dump (dev + live JSON) ==="
./ops/void-mainnet-work-credits-plan-dump.sh

echo
echo "=== [3] summary ==="
echo "  - dev Work Credits tests : OK"
echo "  - PLAN JSON (dev/live)   : OK (dump succeeded; see above)"

echo
echo "[work-credits-health-all] RESULT: OK (tests + PLAN dump)"
