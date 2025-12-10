#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

echo "=== [pillars-preflight] VOID mainnet pillars preflight ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"

if ./ops/void-mainnet-pillars-health-all.sh; then
  echo
  echo "[pillars-preflight] RESULT: OK (safeboot + devnet + mainnet-core + manifest + keys + plan + run + lastmile + validators all healthy)"

echo
echo "[rewardengine] checking mainnet RewardEngine composite pillar ..."
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RE_QUERY='void:mainnet_pillars_with_rewardengine:health:last_5m'

RE_VAL="$(curl -fsS "${PROM_URL}/api/v1/query?query=${RE_QUERY}" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")"

echo "[rewardengine] ${RE_QUERY} = ${RE_VAL}"

if [ "$RE_VAL" != "1" ]; then
  echo "[rewardengine] RESULT: BAD (expected 1)"
  echo "[rewardengine] HINT: check void_mainnet_rewardengine_plan_health and overall pillars_with_rewardengine"
  exit 1
else
  echo "[rewardengine] RESULT: OK"
fi

  exit 0
else
  STATUS=$?
  echo
  echo "[pillars-preflight] RESULT: FAILED (see ops/void-mainnet-pillars-health-all.sh output above)"
  exit "$STATUS"
fi

echo
echo "[pillars-preflight] === step: workcredits health-all (soft, not gating yet) ==="
./ops/void-mainnet-workcredits-health-all.sh || echo "[workcredits-health] NON-ZERO EXIT (ignored for now; pillar is allowed to be red while spec is stubbed)"

echo
echo "[rewardengine] checking mainnet RewardEngine composite pillar ..."
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RE_QUERY='void:mainnet_pillars_with_rewardengine:health:last_5m'

RE_VAL="$(curl -fsS "${PROM_URL}/api/v1/query?query=${RE_QUERY}" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")"

echo "[rewardengine] ${RE_QUERY} = ${RE_VAL}"

if [ "$RE_VAL" != "1" ]; then
  echo "[rewardengine] RESULT: BAD (expected 1)"
  echo "[rewardengine] HINT: check void_mainnet_rewardengine_plan_health and overall pillars_with_rewardengine"
  exit 1
else
  echo "[rewardengine] RESULT: OK"
fi
