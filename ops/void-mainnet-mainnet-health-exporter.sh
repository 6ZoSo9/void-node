#!/usr/bin/env bash
set -euo pipefail

# REPO_ROOT: where void-node lives
REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"

# TEXTFILE_DIR: node_exporter textfile_collector directory
TEXTFILE_DIR="${NODE_EXPORTER_TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
METRIC_FILE="$TEXTFILE_DIR/void_mainnet_mainnet_bootstrap.prom"

# Foundry bin for forge/cast
FOUNDRY_BIN_DIR="${FOUNDRY_BIN_DIR:-/home/zoso/.foundry/bin}"

export PATH="$FOUNDRY_BIN_DIR:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

echo "=== [mainnet-mainnet-exporter] VOID mainnet MAINNET bootstrap health exporter ==="
echo "[cfg] REPO_ROOT       = $REPO_ROOT"
echo "[cfg] TEXTFILE_DIR    = $TEXTFILE_DIR"
echo "[cfg] METRIC_FILE     = $METRIC_FILE"
echo "[cfg] FOUNDRY_BIN_DIR = $FOUNDRY_BIN_DIR"
echo "[cfg] PATH            = $PATH"
echo

# Ensure the textfile directory exists
mkdir -p "$TEXTFILE_DIR"

# Log file for inspection
LOG_FILE="$(mktemp /tmp/void-mainnet-mainnet-health-log.XXXXXX)"

health=0
status=0

# Run the health-all script inside REPO_ROOT and capture output
set +e
(
  cd "$REPO_ROOT" && ./ops/void-mainnet-mainnet-health-all.sh
) >"$LOG_FILE" 2>&1
status=$?
set -e

echo "[run] ops/void-mainnet-mainnet-health-all.sh (status=$status) ..."
echo "[run] leaving log at: $LOG_FILE"
echo

if [ "$status" -eq 0 ]; then
  health=1
else
  health=0
fi

# Write the Prometheus metric
cat > "$METRIC_FILE" <<EOF
# HELP void_mainnet_mainnet_bootstrap_health VOID mainnet MAINNET bootstrap health (1 ok, 0 bad)
# TYPE void_mainnet_mainnet_bootstrap_health gauge
void_mainnet_mainnet_bootstrap_health $health
EOF

echo "[ok] wrote metrics to $METRIC_FILE"
echo "[ok] health = $health"
echo "[ok] log    = $LOG_FILE"
echo "=== [mainnet-mainnet-exporter] DONE ==="

# Ensure textfile is world-readable so node_exporter can scrape it
if [ -f "$METRIC_FILE" ]; then
  chmod 644 "$METRIC_FILE" || true
fi
