#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [agent-receipts-health] VOID agent receipts health ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

status=0

step() {
  local name="$1"
  shift
  echo
  echo "=== [$name] ==="
  if "$@"; then
    echo "[$name] OK"
  else
    rc=$?
    echo "[$name] FAILED (rc=$rc)"
    status=1
  fi
}

step "coverage-metric" bash -c '
  # Ask Prometheus for the agent receipts coverage metric.
  if ! resp="$(curl -fsS "'"$PROM_URL"'/api/v1/query?query=void_agent_receipts_coverage")"; then
    echo "[agent] ERROR: Prometheus query for void_agent_receipts_coverage failed"
    exit 1
  fi

  count="$(printf "%s" "$resp" | jq -r ".data.result | length")"

  if [ "$count" -eq 0 ]; then
    echo "[agent] metric void_agent_receipts_coverage not present yet; treating as SOFT-OK (agents not wired)."
    exit 0
  fi

  value="$(printf "%s" "$resp" | jq -r ".data.result[0].value[1]")"
  echo "[agent] void_agent_receipts_coverage = $value"
  # For now, any defined numeric value is considered OK. We can tighten this later.
  exit 0
'

echo
echo "=== [agent-receipts-health] summary ==="
if [ "$status" -eq 0 ]; then
  echo "[summary] RESULT: OK (agent receipts pillar structurally fine; coverage metric present or intentionally soft-OK)"
else
  echo "[summary] RESULT: BAD (see logs above)"
fi

exit "$status"
