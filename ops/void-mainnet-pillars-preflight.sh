#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

echo "[pillars-preflight] repo=${ROOT}"
echo

echo "[pillars-preflight] === step: safeboot health-all ==="
./ops/void-safeboot-health-all.sh
echo

echo "[pillars-preflight] === step: devnet health-all ==="
./ops/void-devnet-health-all.sh
echo

echo "[pillars-preflight] === step: mainnet-core health-all ==="
./ops/void-mainnet-core-health-all.sh
echo

echo "[pillars-preflight] === step: mainnet-lastmile health-all ==="
./ops/void-mainnet-lastmile-health-all.sh
echo

echo "[pillars-preflight] === step: pillars health-all ==="
./ops/void-mainnet-pillars-health-all.sh
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

echo "[pillars-preflight] === step: pillars+validators+RewardEngine+WorkCredits econ 5m health ==="
combo="$(q 'void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m')"
echo "  void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m = ${combo}"
echo

if [ "${combo}" != "1" ]; then
  echo "[pillars-preflight] ERROR: combined mainnet pillars+validators+RewardEngine+WorkCredits econ 5m health != 1 (=${combo})"
  echo "[pillars-preflight] HINT: run ./ops/void-mainnet-pillars-with-rewardengine-econ-workcredits-health.sh for a detailed breakdown."
  exit 1
fi

echo "[pillars-preflight] RESULT: OK (safeboot + devnet + mainnet-core + mainnet-lastmile + pillars + econ/WorkCredits all healthy)"
