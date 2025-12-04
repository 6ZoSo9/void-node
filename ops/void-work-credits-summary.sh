#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [work-credits-summary] VOID Work Credits summary ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

q() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${expr}" \
  | jq -r '.data.result[]? | "\(.metric) -> \(.value[1])"' || true
}

echo "--- health (v3, 5m) ---"
curl -fsS "${PROM_URL}/api/v1/query" \
  --get --data-urlencode 'query=void:work_credits:health_v3:last_5m' \
| jq -r '
  .data.result[]
  | "health_v3_5m=\(.value[1])"
' || echo "health_v3_5m=<no data>"

echo
echo "--- totals by agent ---"
curl -fsS "${PROM_URL}/api/v1/query" \
  --get --data-urlencode 'query=void:work_credits:total_by_agent' \
| jq -r '
  .data.result[]
  | "agent=\(.metric.agent // "unknown") total=\(.value[1])"
' || echo "no agent totals"

echo
echo "--- totals by pillar ---"
curl -fsS "${PROM_URL}/api/v1/query" \
  --get --data-urlencode 'query=void:work_credits:total_by_pillar' \
| jq -r '
  .data.result[]
  | "pillar=\(.metric.pillar // "unknown") total=\(.value[1])"
' || echo "no pillar totals"

echo
echo "--- totals by agent+pillar ---"
curl -fsS "${PROM_URL}/api/v1/query" \
  --get --data-urlencode 'query=void:work_credits:total_by_agent_pillar' \
| jq -r '
  .data.result[]
  | "agent=\(.metric.agent // "unknown") pillar=\(.metric.pillar // "unknown") total=\(.value[1])"
' || echo "no agent_pillar totals"

echo
echo "=== [work-credits-summary] done ==="
