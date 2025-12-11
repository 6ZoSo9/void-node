#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

jq_query='.data.result[0].value[1] // "NaN"'

echo "=== [RewardEngine Health – summary] ==="
echo "[cfg] prom_url = ${PROM_URL}"
echo

echo "=== [1] MAINNET RewardEngine pillars ==="

echo "- void_mainnet_rewardengine_health"
MAIN_PLAN="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_rewardengine_health" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${MAIN_PLAN}"

echo "- void_mainnet_pillars_with_rewardengine_health"
MAIN_COMPOSITE="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_pillars_with_rewardengine_health" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${MAIN_COMPOSITE}"

echo "- void:mainnet_pillars_with_rewardengine:health:last_5m"
MAIN_COMPOSITE_5M="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_pillars_with_rewardengine:health:last_5m" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${MAIN_COMPOSITE_5M}"

echo
echo "=== [2] DEVNET RewardEngine plan ==="

echo "- void_devnet_rewardengine_health"
DEV_PLAN="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_devnet_rewardengine_health" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${DEV_PLAN}"

echo "- void:devnet_rewardengine:health:last_5m"
DEV_PLAN_5M="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:devnet_rewardengine:health:last_5m" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${DEV_PLAN_5M}"

echo
echo "=== [3] DEVNET RewardEngine code ==="

echo "- void_devnet_rewardengine_code_health"
DEV_CODE="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_devnet_rewardengine_code_health" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${DEV_CODE}"

echo "- void:devnet_rewardengine_code:health:last_5m"
DEV_CODE_5M="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:devnet_rewardengine_code:health:last_5m" | jq -r "${jq_query}" 2>/dev/null || echo "NaN")"
echo "  => ${DEV_CODE_5M}"

echo
echo "=== [4] Interpretation ==="
echo "mainnet_plan        = ${MAIN_PLAN}"
echo "mainnet_pillars_5m  = ${MAIN_COMPOSITE_5M}"
echo "devnet_plan_5m      = ${DEV_PLAN_5M}"
echo "devnet_code_5m      = ${DEV_CODE_5M}"
echo
echo "Expected right now:"
echo "  - mainnet_plan / mainnet_pillars_5m  -> 1 (real pillar, green)."
echo "  - devnet_plan_5m                     -> 1 (JSON says RewardEngine exists)."
echo "  - devnet_code_5m                     -> 0 (no actual RewardEngine contract on devnet yet)."
