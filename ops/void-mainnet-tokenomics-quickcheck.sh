#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [1] targeted mainnet tokenomics + gates + treasury suites ==="
./ops/void-mainnet-tokenomics-health.sh

echo
echo "=== [2] pillars preflight (safeboot + devnet + mainnet-core + lastmile + pillars) ==="
./ops/void-pillars-preflight.sh || {
  echo "[WARN] pillars-preflight failed; check output above" >&2
}

echo
echo "=== [3] git status (short) ==="
git status -sb || true

echo
echo "[mainnet-tokenomics-quickcheck] DONE"
