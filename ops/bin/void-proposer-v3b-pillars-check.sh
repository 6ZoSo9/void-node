#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090}"

q() {
  curl -fsS --max-time 3 -G "$PROM/api/v1/query" \
    --data-urlencode "query=$1" \
  | jq -r '.data.result[0].value[1] // "[no result]"'
}

echo "pillars_ok_v3b=$(q 'void_pillars_health_ok_v3b')"
echo "proposer_ok_v3b=$(q 'void_proposer_v3b_ok')"
echo "with_proposer_now_v3b=$(q 'void_pillars_with_proposer_health_v3b')"
echo "with_proposer_last5m_v3b=$(q 'void:pillars_with_proposer_v3b:health:last_5m')"

echo "alert_state=$(
  curl -fsS --max-time 3 "$PROM/api/v1/rules" \
  | jq -r '.data.groups[]
    | select(.file=="/etc/prometheus/alerts.d/void-pillars-with-proposer-v3b.yml")
    | .rules[]
    | select(.name=="VoidPillarsWithProposerV3BUnhealthy")
    | .state' | head -n 1
)"

# === agent receipts split pillar addon (auto) BEGIN ===
# Fail pre-push / preflight if the agent receipts split pillar is not OK.
# Metric is expected to be a strict scalar 0/1:
#   void_pillars_health_with_agent_receipts_split_scalar
#
# Hard policy: if q is missing or the metric is empty, FAIL (no silent skip).
if [ "${VOID_SKIP_AGENT_RECEIPTS_SPLIT:-0}" = "1" ]; then
  echo "agent_receipts_split_ok_scalar=<skipped>"
else
  if ! command -v q >/dev/null 2>&1; then
    echo "[FAIL] q helper missing; cannot verify agent receipts split pillar."
    exit 1
  fi

  __ars_v="$(q 'void_pillars_health_with_agent_receipts_split_scalar' 2>/dev/null || true)"
  echo "agent_receipts_split_ok_scalar=${__ars_v:-<empty>}"

  if [ -z "${__ars_v:-}" ]; then
    echo "[FAIL] void_pillars_health_with_agent_receipts_split_scalar returned empty."
    exit 1
  fi

  case "${__ars_v:-}" in
    1|1.0|1.00|1.000) : ;;
    *)
      echo "[FAIL] agent receipts split pillar not OK (expected 1)."
      echo "       Fix: write a receipt (or wait for your receipt-write timer), then retry."
      exit 1
      ;;
  esac
fi
# === agent receipts split pillar addon (auto) END ===

