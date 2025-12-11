#!/usr/bin/env bash
set -euo pipefail

# Run from repo root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "=== [dev WorkCredits + RewardEngine health wrapper] ==="

echo
echo "=== [step 1] baseline dev WorkCredits health ==="
./ops/dev-work-credits-health.sh

echo
echo "=== [step 2] focused WorkCredits + RewardEngine tests via FORGE_MATCH ==="
FORGE_MATCH='WorkCredits|RewardEngine' ./ops/dev-work-credits-health.sh

echo
echo "=== [done] ==="
echo "If both step 1 and step 2 look green, WorkCredits + RewardEngine econ are clean at the dev/test level."
