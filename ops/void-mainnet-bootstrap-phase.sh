#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap "phase" inspector.
#
# This is a read-only helper that looks at Prometheus recordings and prints
# a rough phase label for where we are in the bootstrap lifecycle.
#
# Phases (logical model, not on-chain state):
#   - PRE:  core pillars not all healthy yet.
#   - A:    dev bootstrap only, PLAN not configured.
#   - B:    PLAN configured but NOT READY (STRUCT_OK=0, plan_health=0).
#   - C:    PLAN READY (plan_health=1) but we have not modelled "done" yet.
#   - D:    (future) PLAN deployed / mainnet bootstrap DONE (needs new metric).
#
# This script DOES NOT:
#   - touch configs
#   - write metrics
#   - run forge
#   - talk to LUKS or keys
#
# It only curls Prometheus and prints a summary.

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

jq_val() {
  jq -r '.[0].value[1] // empty' 2>/dev/null || true
}

echo "=== [mainnet-bootstrap-phase] VOID mainnet bootstrap phase inspector ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [1] read core + PLAN gauges ==="

pillars=$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:mainnet_pillars:health:last_5m' \
  | jq_val)
lastmile=$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:mainnet_lastmile:health:last_5m' \
  | jq_val)
plan_cfg=$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:mainnet_bootstrap_plan:configured:last_5m' \
  | jq_val)
plan_hlt=$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:mainnet_bootstrap_plan:health:last_5m' \
  | jq_val)

echo "  void:mainnet_pillars:health:last_5m           = ${pillars:-<none>}"
echo "  void:mainnet_lastmile:health:last_5m         = ${lastmile:-<none>}"
echo "  void:mainnet_bootstrap_plan:configured:last_5m = ${plan_cfg:-<none>}"
echo "  void:mainnet_bootstrap_plan:health:last_5m     = ${plan_hlt:-<none>}"
echo

echo "=== [2] interpret phase ==="

phase="UNKNOWN"
reason=""

if [[ "${pillars:-0}" != "1" ]] || [[ "${lastmile:-0}" != "1" ]]; then
  phase="PRE"
  reason="core pillars and/or lastmile not all healthy yet"
else
  case "${plan_cfg:-0}:${plan_hlt:-0}" in
    0:0)
      phase="A"
      reason="PLAN not configured (dev bootstrap only)"
      ;;
    1:0)
      phase="B"
      reason="PLAN configured but NOT READY (struct/roles/contracts/validator0 incomplete)"
      ;;
    1:1)
      phase="C"
      reason="PLAN READY (health=1); broadcast phase not modelled yet"
      ;;
    *)
      phase="UNKNOWN"
      reason="unexpected combination for plan_configured/plan_health"
      ;;
  esac
fi

echo "  phase  : $phase"
echo "  reason : $reason"
echo

echo "=== [3] summary ==="
echo "  - This script is read-only and only inspects Prometheus."
echo "  - Phase labels are a human-friendly view over existing gauges."
echo "  - Phase D (post-bootstrap DONE) will be added once we wire a dedicated metric."
echo
echo "=== [mainnet-bootstrap-phase] DONE ==="
