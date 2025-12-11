#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet — WorkCredits PLAN health-all
#
# Steps:
#   1) Run the PLAN exporter via sudo (writes textfile for node_exporter).
#   2) Best-effort query to Prometheus for void_mainnet_workcredits_plan_health.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [workcredits-plan-health] VOID mainnet WorkCredits PLAN health ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [1] exporter run via sudo ==="
if sudo "$ROOT/ops/void-mainnet-workcredits-plan-exporter.sh"; then
  echo "[exporter] OK (textfile updated)"
else
  echo "[WARN] exporter FAILED (health gauge will likely be 0)" >&2
fi

echo
echo "=== [2] Prometheus gauge snapshot (best-effort) ==="
set +e
RESP="$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_mainnet_workcredits_plan_health' 2>/dev/null)"
RC=$?
set -e

if [[ $RC -ne 0 || -z "$RESP" ]]; then
  echo "[WARN] could not query void_mainnet_workcredits_plan_health from Prometheus" >&2
else
  echo "$RESP" | jq . || echo "[WARN] jq parse failed"
fi

echo
echo "[workcredits-plan-health] DONE"
