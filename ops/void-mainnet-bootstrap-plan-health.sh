#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [mainnet-bootstrap-plan-health] VOID mainnet bootstrap PLAN health ==="
echo "[info] REPO_ROOT = $REPO_ROOT"
echo "[info] PROM_URL  = $PROM_URL"
echo

QUERY='void_mainnet_bootstrap_plan_ready'

echo "[step 1] querying Prometheus for $QUERY..."
RAW_JSON="$(curl -fsS "$PROM_URL/api/v1/query?query=$QUERY" || true)"

if [[ -z "$RAW_JSON" ]]; then
  echo "[error] empty response from Prometheus; is it running at $PROM_URL ?" >&2
  exit 1
fi

echo "$RAW_JSON" | jq '.' || {
  echo "[error] failed to pretty-print Prometheus response with jq" >&2
  exit 1
}

VALUE_STR="$(echo "$RAW_JSON" | jq -r '.data.result[0].value[1] // empty' || true)"

if [[ -z "$VALUE_STR" ]]; then
  echo
  echo "[warn] metric $QUERY not found; treating PLAN as NOT ready (0)."
  READY=0
else
  READY="$VALUE_STR"
fi

echo
echo "[result] $QUERY = $READY"

case "$READY" in
  1)
    echo "[interpretation] PLAN is marked READY (sim passing, fork URL + live config presumably set)."
    ;;
  0)
    echo "[interpretation] PLAN is NOT ready."
    echo "                This is EXPECTED right now since MAINNET_FORK_URL and *.live.json"
    echo "                are not configured yet. No action required until we get closer to mainnet."
    ;;
  *)
    echo "[interpretation] unexpected value for $QUERY (expected 0 or 1)."
    ;;
esac

# NOTE: Do NOT gate anything yet. Exit 0 always for now.
echo
echo "[mainnet-bootstrap-plan-health] RESULT: OK (informational only; no gate)"
