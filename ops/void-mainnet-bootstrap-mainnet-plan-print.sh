#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CONFIG="config/void-mainnet-bootstrap-mainnet.live.json"
OUT_DIR="docs"
mkdir -p "$OUT_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/VOID-MAINNET-BOOTSTRAP-PLAN-$TS.txt"

echo "=== [mainnet-plan-print] VOID mainnet PLAN snapshot ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo "[cfg] CONFIG    = $CONFIG"
echo "[cfg] OUT_FILE  = $OUT_FILE"
echo

if [ ! -f "$CONFIG" ]; then
  echo "[FATAL] config file not found: $CONFIG" >&2
  exit 1
fi

# This calls the PLAN-only script (no broadcasts, no state changes).
# Output goes to both stdout and the snapshot file.
./ops/void-mainnet-bootstrap-mainnet-plan.sh | tee "$OUT_FILE"

echo
echo "[mainnet-plan-print] wrote PLAN snapshot to $OUT_FILE"
