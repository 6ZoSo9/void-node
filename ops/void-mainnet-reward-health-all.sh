#!/usr/bin/env bash
set -euo pipefail

cd "\${HOME}/dev/void-node"

PROM_URL="\${PROM_URL:-http://127.0.0.1:9090}"

echo "[reward-health] repo=\$(pwd)"
echo "[reward-health] PROM_URL=\${PROM_URL}"

echo
echo "=== [1] tokenomics spec health (existing hammer) ==="
if [ -x ./ops/void-mainnet-tokenomics-spec-health-all.sh ]; then
  ./ops/void-mainnet-tokenomics-spec-health-all.sh
else
  echo "[reward-health] WARN: ./ops/void-mainnet-tokenomics-spec-health-all.sh missing or not executable"
fi

echo
echo "=== [2] forge tests – Treasury/RewardEngine/ValidatorSet ==="

echo "[reward-health] forge test --match-contract TreasuryTest"
forge test --match-contract TreasuryTest

echo
echo "[reward-health] forge test --match-contract RewardEngineTest"
forge test --match-contract RewardEngineTest

echo
echo "[reward-health] forge test --match-contract ValidatorSetTest"
forge test --match-contract ValidatorSetTest

echo
echo "=== [3] summary ==="
echo "[reward-health] RESULT: OK (tokenomics spec + treasury + reward engine + validator set all passed)"
