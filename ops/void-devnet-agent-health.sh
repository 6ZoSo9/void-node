#!/usr/bin/env bash
set -euo pipefail

REPO="${VOID_REPO:-$HOME/dev/void-node}"
STATUS_SCRIPT="$REPO/ops/void-devnet-status.sh"
CACHE_FILE="${VOID_DEVNET_COVERAGE_FILE:-$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom}"

cd "$REPO"

if [ ! -x "$STATUS_SCRIPT" ]; then
  echo "[ERR] missing status script: $STATUS_SCRIPT" >&2
  exit 1
fi

echo "[health] repo=$REPO"
echo "[health] status_script=$STATUS_SCRIPT"
echo "[health] cache_file=$CACHE_FILE"

# Recompute coverage snapshot (this writes the textfile we parse)
"$STATUS_SCRIPT" >/dev/null

if [ ! -f "$CACHE_FILE" ]; then
  echo "[ERR] coverage file not found: $CACHE_FILE" >&2
  exit 1
fi

cov=$(grep -E '^void_devnet_coverage\{' "$CACHE_FILE" | awk '{print $2}')
jobs=$(grep -E '^void_devnet_jobs_total\{' "$CACHE_FILE" | awk '{print $2}')
receipts=$(grep -E '^void_devnet_receipts_total\{' "$CACHE_FILE" | awk '{print $2}')
health=$(grep -E '^void_devnet_coverage_health\{' "$CACHE_FILE" | awk '{print $2}')

echo "[health] coverage=$cov jobs=$jobs receipts=$receipts health=$health"

if [ "$health" = "1" ]; then
  exit 0
else
  exit 1
fi
