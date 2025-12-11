#!/usr/bin/env bash
set -euo pipefail

# Devnet RewardEngine smoke harness
#
# This DOES NOT yet run a real stake->accrue->claim flow.
# It simply:
#   - Reads devnet RewardEngine plan + code health from Prometheus
#   - Decides:
#       * SKIP (expected) when code health == 0
#       * TODO hook when code health == 1 (real contract present)
#
# This is designed to be CI/pre-push friendly.

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

jq_val='.data.result[0].value[1] // "NaN"'

echo "=== [devnet RewardEngine smoke] ==="
echo "[cfg] prom_url = ${PROM_URL}"
echo

echo "=== [1] fetch devnet RewardEngine plan + code health] ==="

PLAN_5M="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:devnet_rewardengine:health:last_5m" | jq -r "${jq_val}" 2>/dev/null || echo "NaN")"
CODE_5M="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:devnet_rewardengine_code:health:last_5m" | jq -r "${jq_val}" 2>/dev/null || echo "NaN")"

echo "plan_5m = ${PLAN_5M}"
echo "code_5m = ${CODE_5M}"
echo

# Normalize for safety
plan_ok=0
code_ok=0

[[ "$PLAN_5M" == "1" ]] && plan_ok=1
[[ "$CODE_5M" == "1" ]] && code_ok=1

if [[ "$plan_ok" -eq 0 ]]; then
  echo "[SMOKE] SKIP: devnet RewardEngine plan is not healthy (plan_5m=${PLAN_5M})."
  echo "        This is expected until devnet state JSON has a proper RewardEngine entry."
  exit 0
fi

if [[ "$code_ok" -eq 0 ]]; then
  echo "[SMOKE] SKIP: devnet RewardEngine code is not healthy yet (code_5m=${CODE_5M})."
  echo "        This is expected while devnet RewardEngine is still a stub (no contract deployed)."
  exit 0
fi

echo "[SMOKE] OK: devnet RewardEngine plan + code health are both green."
echo "        This is where we will later run a real stake->accrue->claim WC smoke test."
echo "        (TODO: implement once RewardEngine is actually deployed on devnet.)"

exit 0
