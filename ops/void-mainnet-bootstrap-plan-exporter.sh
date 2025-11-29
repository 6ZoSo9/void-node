#!/usr/bin/env bash
set -euo pipefail

# Emits a Prometheus textfile gauge:
#   void_mainnet_bootstrap_plan_structural_health 0|1
#
# 1 = PLAN structurally READY-ish (all critical fields populated in live.json)
# 0 = PLAN NOT_READY (missing contracts and/or validator0 fields)

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
METRIC_NAME="void_mainnet_bootstrap_plan_structural_health"
OUT_FILE="${TEXTFILE_DIR}/void_mainnet_bootstrap_plan.prom"

cd "$REPO_ROOT"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[plan-exporter] WARNING: config file not found: $CONFIG_PATH" >&2
  # If the live config doesn't exist, treat as NOT_READY.
  PLAN_HEALTH=0
else
  # Run the PLAN view script; its exit code is our health signal.
  PLAN_HEALTH=0
  if ./ops/void-mainnet-bootstrap-plan-view.sh >/dev/null; then
    PLAN_HEALTH=1
  else
    PLAN_HEALTH=0
  fi
fi

# Make sure textfile dir exists
mkdir -p "$TEXTFILE_DIR"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

cat >"$TMP_FILE" <<EOF2
# HELP ${METRIC_NAME} VOID mainnet bootstrap PLAN structural health (1=READY-ish, 0=NOT_READY)
# TYPE ${METRIC_NAME} gauge
${METRIC_NAME} ${PLAN_HEALTH}
EOF2

mv "$TMP_FILE" "$OUT_FILE"
chmod 644 "$OUT_FILE"

echo "[plan-exporter] wrote ${OUT_FILE} with ${METRIC_NAME}=${PLAN_HEALTH}"
