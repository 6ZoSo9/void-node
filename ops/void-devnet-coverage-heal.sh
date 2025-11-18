#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/dev/void-node}"
STATUS_SCRIPT="$REPO/ops/void-devnet-status.sh"
SWEEP_SCRIPT="$REPO/ops/void-devnet-agent-sweep.sh"
COVERAGE_FILE="$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom"
ATTEMPTS="${ATTEMPTS:-5}"

echo "[heal] repo=$REPO"
echo "[heal] status_script=$STATUS_SCRIPT"
echo "[heal] sweep_script=$SWEEP_SCRIPT"
echo "[heal] coverage_file=$COVERAGE_FILE"
echo "[heal] attempts=$ATTEMPTS"

if [ ! -x "$STATUS_SCRIPT" ]; then
  echo "[heal] ERROR: status script not found or not executable: $STATUS_SCRIPT" >&2
  exit 1
fi

if [ ! -x "$SWEEP_SCRIPT" ]; then
  echo "[heal] ERROR: sweep script not found or not executable: $SWEEP_SCRIPT" >&2
  exit 1
fi

cd "$REPO"

health="0"

for i in $(seq 1 "$ATTEMPTS"); do
  echo
  echo "[heal] === pass $i/$ATTEMPTS ==="
  echo "[heal] recomputing coverage via status script..."
  "$STATUS_SCRIPT" >/tmp/void-devnet-status.heal.$$.log 2>&1 || echo "[heal] WARN: status script failed (non-fatal)"

  if [ ! -f "$COVERAGE_FILE" ]; then
    echo "[heal] WARN: coverage file not found yet at $COVERAGE_FILE"
  else
    coverage=$(awk '/void_devnet_coverage{/{print $2}' "$COVERAGE_FILE" | tail -n 1 || echo "0")
    jobs=$(awk '/void_devnet_jobs_total{/{print $2}' "$COVERAGE_FILE" | tail -n 1 || echo "0")
    receipts=$(awk '/void_devnet_receipts_total{/{print $2}' "$COVERAGE_FILE" | tail -n 1 || echo "0")
    health=$(awk '/void_devnet_coverage_health{/{print $2}' "$COVERAGE_FILE" | tail -n 1 || echo "0")

    echo "[heal] snapshot: coverage=$coverage jobs=$jobs receipts=$receipts health=$health"

    if [ "$health" = "1" ]; then
      echo "[heal] OK – coverage already healthy; nothing else to do."
      exit 0
    fi
  fi

  echo "[heal] running agent sweep..."
  "$SWEEP_SCRIPT" || echo "[heal] WARN: sweep script failed (non-fatal)"
done

echo
echo "[heal] final coverage snapshot:"
if [ -f "$COVERAGE_FILE" ]; then
  sed -n '1,40p' "$COVERAGE_FILE"
else
  echo "[heal] (no coverage file found)"
fi

if [ "${health:-0}" = "1" ]; then
  echo "[heal] OK – coverage healthy after $ATTEMPTS passes."
  exit 0
else
  echo "[heal] ERROR – coverage still not healthy after $ATTEMPTS passes."
  exit 1
fi
