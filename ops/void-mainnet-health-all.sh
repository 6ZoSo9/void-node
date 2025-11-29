#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-health-all] PROM_URL=$PROM_URL"

query() {
  local expr="$1"
  echo
  echo ">>> $expr"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq '.data.result'
}

# Core expressions
EXPR_OVERALL_V2='void:mainnet_overall:health:last_5m_v2'
EXPR_PILLARS='void:mainnet_pillars:health:last_5m'
EXPR_LASTMILE_5M='void:mainnet_lastmile:health:last_5m'
EXPR_LASTMILE_LAST='void:mainnet_lastmile_health:last'
EXPR_SAFEBOOT='void_safeboot_overall_health'
EXPR_PLAN_5M='void:mainnet_bootstrap_plan:health:last_5m'

# Dump main signals for inspection (even if NOT used as hard gates)
query "$EXPR_OVERALL_V2"
query "$EXPR_PILLARS"
query "$EXPR_LASTMILE_5M"
query "$EXPR_LASTMILE_LAST"
query "$EXPR_SAFEBOOT"
query "$EXPR_PLAN_5M"

# Extract scalar values for gating
pillars_5m=$(
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$EXPR_PILLARS" \
    | jq -r '.data.result[0].value[1] // "NaN"'
)

lastmile_5m=$(
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$EXPR_LASTMILE_5M" \
    | jq -r '.data.result[0].value[1] // "NaN"'
)

plan_5m=$(
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$EXPR_PLAN_5M" \
    | jq -r '.data.result[0].value[1] // "NaN"'
)

echo
echo "=== [gating scalars] ==="
echo "void:mainnet_pillars:health:last_5m=$pillars_5m"
echo "void:mainnet_lastmile:health:last_5m=$lastmile_5m"
echo "void:mainnet_bootstrap_plan:health:last_5m=$plan_5m"

ok=1
if [[ "$pillars_5m" != "1" ]]; then
  echo "[gate] pillars_5m != 1 (got $pillars_5m)"
  ok=0
fi

if [[ "$lastmile_5m" != "1" ]]; then
  echo "[gate] lastmile_5m != 1 (got $lastmile_5m)"
  ok=0
fi

if [[ "$plan_5m" != "1" ]]; then
  echo "[gate] plan_5m != 1 (got $plan_5m)"
  ok=0
fi

echo
if [[ "$ok" == "1" ]]; then
  echo "[mainnet-health-all] RESULT: OK (pillars + lastmile + bootstrap PLAN 5m == 1; overall_v2 is informational only)"
  exit 0
else
  echo "[mainnet-health-all] RESULT: NOT_OK (one or more gates failed)"
  exit 1
fi
