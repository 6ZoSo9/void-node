#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [mainnet-bootstrap-plan-health] VOID mainnet bootstrap PLAN health ==="
echo "[info] REPO_ROOT   = $REPO_ROOT"
echo "[info] CONFIG_PATH = $CONFIG_PATH"
echo

PLAN_RC=0

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[warn] config file not found: $CONFIG_PATH" >&2
  PLAN_RC=1
else
  set +e
  ./ops/void-mainnet-bootstrap-mainnet-plan.sh "$CONFIG_PATH"
  PLAN_RC=$?
  set -e
fi

METRIC_FILE="$REPO_ROOT/ops/textfile/void_mainnet_bootstrap_plan.prom"
PLAN_READY_METRIC="0"

if [[ -f "$METRIC_FILE" ]]; then
  PLAN_READY_METRIC="$(awk '/^void_mainnet_bootstrap_plan_ready[[:space:]]+/ {print $2}' "$METRIC_FILE" 2>/dev/null | tail -n1 || echo "0")"
else
  echo "[warn] metric file missing: $METRIC_FILE" >&2
fi

echo
echo "=== [summary] ==="
if [[ "$PLAN_RC" -eq 0 && "$PLAN_READY_METRIC" == "1" ]]; then
  echo "[OK] bootstrap PLAN is GREEN (void_mainnet_bootstrap_plan_ready=1, exit=$PLAN_RC)"
  FINAL_RC=0
else
  echo "[WARN] bootstrap PLAN is NOT ready yet (ready_metric=$PLAN_READY_METRIC, exit=$PLAN_RC)"
  FINAL_RC=1
fi

echo
if [[ -f "$METRIC_FILE" ]]; then
  echo "=== [metric file] $METRIC_FILE ==="
  cat "$METRIC_FILE"
else
  echo "=== [metric file missing] $METRIC_FILE ==="
fi

exit "$FINAL_RC"
