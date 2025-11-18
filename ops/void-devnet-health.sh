#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-"$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"}"
STATUS_SCRIPT="$REPO/ops/void-devnet-status.sh"
COVERAGE_FILE_DEFAULT="$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom"
LOG="${TMPDIR:-/tmp}/void-devnet-health.$$.log"

echo "[health] repo=$REPO"
echo "[health] RPC_URL=$RPC_URL"
echo "[health] STATE_FILE=$STATE_FILE"
echo "[health] status_script=$STATUS_SCRIPT"

# --- 0) Basic sanity checks ---
if [ ! -f "$STATE_FILE" ]; then
  echo "[ERR] missing STATE_FILE: $STATE_FILE"
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERR] missing 'cast' (foundry). Install Foundry or ensure it is on PATH."
  exit 1
fi

if [ ! -x "$STATUS_SCRIPT" ]; then
  echo "[ERR] missing or non-executable status script: $STATUS_SCRIPT"
  exit 1
fi

# --- 1) Check RPC chainId vs STATE chainId ---
CHAIN_ID_RAW="$(cast chain-id --rpc-url "$RPC_URL" 2>>"$LOG" || true)"
if [ -z "${CHAIN_ID_RAW:-}" ]; then
  echo "[ERR] unable to read chainId via RPC_URL=$RPC_URL"
  echo "---- tail log ----"
  tail -n 20 "$LOG" || true
  exit 1
fi

CHAIN_ID_JSON="$(jq -r '.chainId' "$STATE_FILE" 2>>"$LOG" || true)"

echo "[health] chainId(raw)=$CHAIN_ID_RAW chainId(json)=$CHAIN_ID_JSON"

if [ -z "${CHAIN_ID_JSON:-}" ] || [ "$CHAIN_ID_JSON" = "null" ]; then
  echo "[ERR] STATE_FILE has no valid .chainId"
  exit 1
fi

if [ "$CHAIN_ID_RAW" != "$CHAIN_ID_JSON" ]; then
  echo "[ERR] chainId mismatch (raw=$CHAIN_ID_RAW, json=$CHAIN_ID_JSON)"
  exit 1
fi

# --- 2) Run devnet status script to refresh coverage textfile ---
echo "[health] refreshing devnet coverage via status script..."
STATUS_OUT="$("$STATUS_SCRIPT" 2>>"$LOG" || true)"

echo "[health] --- status output (first lines) ---"
echo "$STATUS_OUT" | sed -n '1,12p'

# Try to discover coverage file path from status output, otherwise fall back
COVERAGE_FILE="$(echo "$STATUS_OUT" | awk '/coverage snapshot:/ {print $NF}' | tail -n 1)"
if [ -z "${COVERAGE_FILE:-}" ]; then
  COVERAGE_FILE="$COVERAGE_FILE_DEFAULT"
fi

echo "[health] coverage_file=$COVERAGE_FILE"

if [ ! -f "$COVERAGE_FILE" ]; then
  echo "[ERR] coverage file not found: $COVERAGE_FILE"
  echo "---- log tail ----"
  tail -n 20 "$LOG" || true
  exit 1
fi

# --- 3) Parse metrics from coverage textfile ---
COVERAGE="$(awk '/^void_devnet_coverage\{/{print $NF}' "$COVERAGE_FILE" | tail -n 1)"
JOBS="$(awk '/^void_devnet_jobs_total\{/{print $NF}' "$COVERAGE_FILE" | tail -n 1)"
RECEIPTS="$(awk '/^void_devnet_receipts_total\{/{print $NF}' "$COVERAGE_FILE" | tail -n 1)"
HEALTH="$(awk '/^void_devnet_coverage_health\{/{print $NF}' "$COVERAGE_FILE" | tail -n 1)"

echo "[health] parsed metrics: coverage=${COVERAGE:-?} jobs=${JOBS:-?} receipts=${RECEIPTS:-?} health=${HEALTH:-?}"

if [ -z "${COVERAGE:-}" ] || [ -z "${JOBS:-}" ] || [ -z "${RECEIPTS:-}" ] || [ -z "${HEALTH:-}" ]; then
  echo "[ERR] one or more metrics missing in $COVERAGE_FILE"
  sed -n '1,40p' "$COVERAGE_FILE" || true
  exit 1
fi

# --- 4) Validate health and invariants ---
if [ "$HEALTH" != "1" ]; then
  echo "[ERR] devnet coverage health != 1 (health=$HEALTH)"
  sed -n '1,40p' "$COVERAGE_FILE" || true
  exit 1
fi

if [ "$JOBS" != "$RECEIPTS" ]; then
  echo "[ERR] jobs != receipts (jobs=$JOBS receipts=$RECEIPTS)"
  sed -n '1,40p' "$COVERAGE_FILE" || true
  exit 1
fi

# Optional: coverage itself should be 1
if [ "$COVERAGE" != "1" ]; then
  echo "[WARN] coverage metric != 1 (coverage=$COVERAGE) but jobs==receipts && health==1"
fi

rm -f "$LOG" 2>/dev/null || true

echo "[health] OK – VOID devnet RPC+STATE+coverage look healthy."
echo "[health] summary: chainId=$CHAIN_ID_RAW jobs=$JOBS receipts=$RECEIPTS coverage=$COVERAGE health=$HEALTH"
