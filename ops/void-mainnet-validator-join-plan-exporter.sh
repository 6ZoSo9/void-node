#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet — validator join PLAN textfile exporter
#
# Copies the PLAN metric from the user cache into the node_exporter
# textfile_collector directory so Prometheus can scrape it.

SRC="$HOME/.cache/node-exporter-textfile/void_mainnet_validator_join_plan.prom"
DST_DIR="/var/lib/node_exporter/textfile_collector"
DST="$DST_DIR/void_mainnet_validator_join_plan.prom"

echo "=== [validator-join-plan-exporter] VOID mainnet validator join PLAN exporter ==="
echo "[cfg] SRC     = $SRC"
echo "[cfg] DST_DIR = $DST_DIR"
echo "[cfg] DST     = $DST"
echo

if [[ ! -f "$SRC" ]]; then
  echo "[error] source PLAN metric not found:"
  echo "        $SRC"
  echo
  echo "[hint] run ./ops/void-mainnet-validator-join-plan.sh first."
  exit 1
fi

if [[ ! -d "$DST_DIR" ]]; then
  echo "[error] destination dir missing (need node_exporter textfile_collector):"
  echo "        $DST_DIR"
  echo
  echo "[hint] ensure node_exporter is installed and textfile_collector is configured."
  exit 1
fi

echo "[info] installing PLAN metric via sudo install..."
sudo install -o root -g root -m 0644 "$SRC" "$DST"

echo
echo "[ok] installed:"
ls -l "$DST" || true

echo
echo "[result] validator0 join PLAN metric exported to node_exporter textfile_collector."
