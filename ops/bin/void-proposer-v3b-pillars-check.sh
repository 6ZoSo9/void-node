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
