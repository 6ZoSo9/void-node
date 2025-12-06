#!/usr/bin/env bash
set -euo pipefail

echo "=== [workcredits-devnet-health-all] VOID WorkCredits devnet health + PLAN ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"

echo
echo "=== [1] base exporter + liquidity health ==="
if ./ops/void-workcredits-devnet-health.sh; then
  echo "[info] base health script completed."
else
  status=$?
  echo "[warn] base health script exited with status $status"
fi

echo
echo "=== [2] PLAN health metric (void_workcredits_devnet_plan_health) ==="

set +e
raw="$(curl -fsS "$PROM_URL/api/v1/query?query=void_workcredits_devnet_plan_health" 2>/dev/null | jq -c '.data.result' 2>/dev/null)"
status=$?
set -e

if [[ $status -ne 0 || -z "${raw:-}" ]]; then
  echo "[warn] failed to query Prometheus for plan metric (status=$status)"
  echo "=> plan_ok: (unknown; metric missing or Prometheus down)"
  exit 0
fi

echo "$raw" | jq '.'

plan_ok="$(echo "$raw" | jq -r '.[0].value[1] // empty')"

if [[ -z "$plan_ok" ]]; then
  echo "=> plan_ok: (no data)"
else
  echo "=> plan_ok: $plan_ok (0=not-ready, 1=ready)"
fi

echo
echo "=== [3] summary ==="
if [[ "${plan_ok:-0}" == "1" ]]; then
  echo "[result] WorkCredits devnet PLAN: READY (plan_ok=1)"
else
  echo "[result] WorkCredits devnet PLAN: NOT READY (plan_ok=${plan_ok:-0})"
fi
