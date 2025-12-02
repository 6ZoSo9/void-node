#!/usr/bin/env bash
set -euo pipefail

ts() { date -Is; }

echo "[$(ts)] === [mainnet-run exporter-root] VOID mainnet RUN state -> node_exporter textfile ==="

ROOT="${ROOT:-$HOME/dev/void-node}"
TEXTFILE_PATH="${TEXTFILE_PATH:-/var/lib/node_exporter/textfile_collector/void_mainnet_run_state.prom}"

cd "$ROOT"

echo "[$(ts)] ROOT         = $ROOT"
echo "[$(ts)] TEXTFILE_PATH= $TEXTFILE_PATH"

sudo TEXTFILE_PATH="$TEXTFILE_PATH" \
  ROOT="$ROOT" \
  CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json" \
  STATE_PATH="config/void-mainnet-bootstrap-mainnet.state.json" \
  ./ops/void-mainnet-bootstrap-run-exporter.sh
