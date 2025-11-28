#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap SAFETY CHECK
#
# This script is a safety gate around the bootstrap PLAN +
# Prometheus mainnet health gauges. It:
#   1) Runs the read-only PLAN script against the given config/RPC.
#   2) Queries Prometheus for mainnet health gauges.
#   3) Fails hard if any of them are not 1.
#
# It is designed to be used in dev and in heavily-gated
# mainnet bootstrap flows.
#
# Usage:
#   ./ops/void-mainnet-bootstrap-safety.sh \
#     --config config/void-mainnet-bootstrap-dev.json \
#     --rpc    http://127.0.0.1:8545 \
#     --prom   http://127.0.0.1:9090
#
# NOTE:
#   - This script NEVER sends transactions. It only calls PLAN
#     (read-only) and Prometheus.

CONFIG="config/void-mainnet-bootstrap-dev.json"
RPC_URL="http://127.0.0.1:8545"
PROM_URL="http://127.0.0.1:9090"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --rpc)
      RPC_URL="$2"
      shift 2
      ;;
    --prom)
      PROM_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 --config <config.json> --rpc <rpc-url> --prom <prom-url>"
      exit 0
      ;;
    *)
      echo "[FATAL] Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

echo "=== VOID mainnet bootstrap SAFETY CHECK ==="
echo "[info] CONFIG   = $CONFIG"
echo "[info] RPC      = $RPC_URL"
echo "[info] PROM_URL = $PROM_URL"
echo

# ---------- STEP 1: PLAN (read-only) ----------

echo "=== [STEP 1] PLAN (read-only) ==="
if [[ ! -x ops/void-mainnet-bootstrap-plan.sh ]]; then
  echo "[FATAL] ops/void-mainnet-bootstrap-plan.sh not found or not executable" >&2
  exit 1
fi

./ops/void-mainnet-bootstrap-plan.sh \
  --config "$CONFIG" \
  --rpc    "$RPC_URL"

echo
echo "[OK] PLAN script completed successfully."
echo

# ---------- STEP 2: Prometheus gauges ----------

echo "=== [STEP 2] Prometheus mainnet health gauges ===" >&2

q_overall='void:mainnet_overall:health:last_5m_v2'
q_pillars='void:mainnet_pillars:health:last_5m'
q_lastmile='void:mainnet_lastmile:health:last_5m'
q_token='void_mainnet_tokenomics_health'

fetch_gauge() {
  local query="$1"
  local label="$2"

  local resp
  resp=$(curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${query}" 2>/dev/null || true)

  if [[ -z "$resp" ]]; then
    echo "[FATAL] failed to query Prometheus for ${label} (${query})" >&2
    exit 1
  fi

  local val
  val=$(printf '%s\n' "$resp" | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")

  # Human-readable log to stderr
  echo "${label} = ${val}" >&2

  # Machine-readable value to stdout (for command substitution)
  echo "$val"
}

overall_val=$(fetch_gauge "$q_overall"  "mainnet_overall(last_5m_v2)")
pillars_val=$(fetch_gauge "$q_pillars"  "mainnet_pillars(last_5m)")
lastmile_val=$(fetch_gauge "$q_lastmile" "mainnet_lastmile(last_5m)")
token_val=$(fetch_gauge "$q_token"      "mainnet_tokenomics_health")

echo >&2

fail=0

if [[ "$overall_val" != "1" ]]; then
  echo "[FATAL] mainnet_overall(last_5m_v2) != 1 (got ${overall_val})" >&2
  fail=1
fi

if [[ "$pillars_val" != "1" ]]; then
  echo "[FATAL] mainnet_pillars(last_5m) != 1 (got ${pillars_val})" >&2
  fail=1
fi

if [[ "$lastmile_val" != "1" ]]; then
  echo "[FATAL] mainnet_lastmile(last_5m) != 1 (got ${lastmile_val})" >&2
  fail=1
fi

if [[ "$token_val" != "1" ]]; then
  echo "[FATAL] mainnet_tokenomics_health != 1 (got ${token_val})" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "=== [RESULT] SAFETY CHECK FAILED ===" >&2
  echo "One or more mainnet gauges != 1. Investigate before proceeding." >&2
  exit 1
fi

echo "=== [RESULT] SAFETY CHECK PASSED ==="
echo "PLAN ok + all mainnet health gauges == 1."
