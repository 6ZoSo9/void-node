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
# Policy: pre-push gates on exporter health (UP), not on "recent writes".
# Reason: activity gates are flaky unless you also run an always-on writer timer.
if [ "${VOID_SKIP_AGENT_RECEIPTS_SPLIT:-0}" = "1" ]; then
  echo "agent_receipts_split_up=<skipped>"
else
  __ars_up="$(
    curl -fsS --max-time 3 -G "${PROM}/api/v1/query"       --data-urlencode 'query=scalar(up{job="void-agent-receipts-split"} == 1)'     | jq -r '
        if .data.resultType=="scalar" then (.data.result[1] // "")
        elif .data.resultType=="vector" then (.data.result[0].value[1] // "")
        else "" end
      ' 2>/dev/null || true
  )"
  echo "agent_receipts_split_up=${__ars_up:-<empty>}"

  if [ -z "${__ars_up:-}" ]; then
    echo "[FAIL] agent receipts split UP query returned empty."
    exit 1
  fi

  case "${__ars_up:-}" in
    1|1.0|1.00|1.000) : ;;
    *)
      echo "[FAIL] agent receipts split exporter not UP (expected 1)."
      exit 1
      ;;
  esac
fi
# === agent receipts split pillar addon (auto) END ===

# === pillars addons composite gate (optional) BEGIN ===
# Default: OFF (do not enforce). Enable with:
#   VOID_ENFORCE_PILLARS_ADDONS=1
# Skip explicitly with:
#   VOID_SKIP_PILLARS_ADDONS=1
if [ "${VOID_ENFORCE_PILLARS_ADDONS:-0}" = "1" ] && [ "${VOID_SKIP_PILLARS_ADDONS:-0}" != "1" ]; then
  __addons="$(
    curl -fsS --max-time 3 -G "${PROM}/api/v1/query" \
      --data-urlencode 'query=void_pillars_addons_health_scalar' \
    | jq -r '.data.result[0].value[1] // ""' 2>/dev/null || true
  )"
  echo "pillars_addons_health_scalar=${__addons:-<empty>}"

  if [ -z "${__addons:-}" ]; then
    echo "[FAIL] void_pillars_addons_health_scalar returned empty."
    exit 1
  fi

  case "${__addons:-}" in
    1|1.0|1.00|1.000) : ;;
    *)
      echo "[FAIL] pillars addons composite not OK (expected 1)."
      echo "       Fix: ensure addon exporters are UP (agent receipts split), then retry."
      exit 1
      ;;
  esac
else
  echo "pillars_addons_health_scalar=<not_enforced>"
fi
# === pillars addons composite gate (optional) END ===





