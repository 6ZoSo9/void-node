#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

# Try to anchor to repo root if possible
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi

echo "[plan-health] repo=$(pwd)"
echo "[plan-health] prom_url=$PROM_URL"
echo

echo "[plan-health] checking raw plan gauges..."
RAW_CONFIGURED=$(
  curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_configured" \
    | jq -r '.data.result[0].value[1] // "NaN"' || echo "ERR"
)
RAW_HEALTH=$(
  curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health" \
    | jq -r '.data.result[0].value[1] // "NaN"' || echo "ERR"
)
RAW_5M=$(
  curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
    | jq -r '.data.result[0].value[1] // "NaN"' || echo "ERR"
)

echo "  void_mainnet_bootstrap_plan_configured = $RAW_CONFIGURED"
echo "  void_mainnet_bootstrap_plan_health     = $RAW_HEALTH"
echo "  void:mainnet_bootstrap_plan:health:last_5m = $RAW_5M"
echo

GATE_OK=1

if [[ "$RAW_CONFIGURED" != "1" ]]; then
  echo "[gate] plan_configured != 1 (got $RAW_CONFIGURED)"
  GATE_OK=0
fi

if [[ "$RAW_5M" != "1" ]]; then
  echo "[gate] plan_5m != 1 (got $RAW_5M)"
  GATE_OK=0
fi

echo
echo "[plan-health] running structural checklist..."
CHECKLIST_OK=1
if ! ./ops/void-mainnet-bootstrap-plan-checklist.sh; then
  echo "[plan-health] checklist exited non-zero"
  CHECKLIST_OK=0
fi

echo
echo "=== [plan-health summary] ==="
echo "  gauges_ok    = $GATE_OK"
echo "  checklist_ok = $CHECKLIST_OK"

if [[ "$GATE_OK" == "1" && "$CHECKLIST_OK" == "1" ]]; then
  echo "[plan-health] RESULT: OK (PLAN configured & healthy)"
  exit 0
fi

echo "[plan-health] RESULT: NOT_OK (PLAN not ready yet)"
exit 1
