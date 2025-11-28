#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap SAFETY CHECK
#
# This script does NOT send transactions.
# It:
#   1) Runs the PLAN script (read-only) against a config + RPC.
#   2) Checks mainnet-core health metrics in Prometheus.
#   3) Exits 0 only if everything looks OK.
#
# Usage:
#   ./ops/void-mainnet-bootstrap-safety-check.sh \
#     --config config/void-mainnet-bootstrap-mainnet.live.json \
#     --rpc    https://your-mainnet-rpc
#
# For dev/anvil rehearsal:
#   ./ops/void-mainnet-bootstrap-safety-check.sh \
#     --config config/void-mainnet-bootstrap-dev.json \
#     --rpc    http://127.0.0.1:8545
#
# Optional env:
#   PROM_URL=http://127.0.0.1:9090 (default)

CONFIG=""
RPC_URL=""
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

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
    -h|--help)
      echo "Usage: $0 --config <config.json> --rpc <rpc-url>"
      echo
      echo "This script:"
      echo "  - Runs PLAN (read-only)"
      echo "  - Queries Prometheus mainnet health gauges"
      echo "  - Exits 0 only if all gates are green"
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CONFIG" ]]; then
  echo "[ERROR] --config is required" >&2
  exit 1
fi

if [[ -z "$RPC_URL" ]]; then
  echo "[ERROR] --rpc is required" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[ERROR] curl not found on PATH." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq not found on PATH." >&2
  exit 1
fi

echo "=== VOID mainnet bootstrap SAFETY CHECK ==="
echo "[info] CONFIG   = $CONFIG"
echo "[info] RPC      = $RPC_URL"
echo "[info] PROM_URL = $PROM_URL"
echo

echo "=== [STEP 1] PLAN (read-only) ==="
set +e
./ops/void-mainnet-bootstrap-plan.sh \
  --config "$CONFIG" \
  --rpc    "$RPC_URL"
PLAN_RC=$?
set -e

if [[ $PLAN_RC -ne 0 ]]; then
  echo
  echo "[FAIL] PLAN script failed with exit code $PLAN_RC"
else
  echo
  echo "[OK] PLAN script completed successfully."
fi

echo
echo "=== [STEP 2] Prometheus mainnet health gauges ==="

query_scalar() {
  local q="$1"
  local label="$2"
  local raw
  raw=$(curl -fsS "${PROM_URL}/api/v1/query" --data-urlencode "query=${q}" 2>/dev/null || echo "")
  if [[ -z "$raw" ]]; then
    echo "[WARN] $label: empty response from Prometheus"
    echo "null"
    return
  fi
  local v
  v=$(echo "$raw" | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")
  echo "$v"
}

METRIC_OVERALL=$(query_scalar 'void:mainnet_overall:health:last_5m_v2' 'mainnet_overall')
METRIC_PILLARS=$(query_scalar 'void:mainnet_pillars:health:last_5m' 'mainnet_pillars')
METRIC_LASTMILE=$(query_scalar 'void:mainnet_lastmile:health:last_5m' 'mainnet_lastmile')
METRIC_TOKENOMICS=$(query_scalar 'void_mainnet_tokenomics_health' 'mainnet_tokenomics')

echo
echo "mainnet_overall(last_5m_v2) = $METRIC_OVERALL"
echo "mainnet_pillars(last_5m)    = $METRIC_PILLARS"
echo "mainnet_lastmile(last_5m)   = $METRIC_LASTMILE"
echo "mainnet_tokenomics_health   = $METRIC_TOKENOMICS"
echo

SAFE=1

if [[ $PLAN_RC -ne 0 ]]; then
  SAFE=0
fi

for val in "$METRIC_OVERALL" "$METRIC_PILLARS" "$METRIC_LASTMILE" "$METRIC_TOKENOMICS"; do
  if [[ "$val" != "1" ]]; then
    SAFE=0
  fi
done

if [[ $SAFE -eq 1 ]]; then
  echo "=== [RESULT] SAFETY CHECK PASSED ==="
  echo "PLAN ok + all mainnet health gauges == 1."
  exit 0
else
  echo "=== [RESULT] SAFETY CHECK FAILED ==="
  echo "Either PLAN failed or one/more health gauges are not 1."
  exit 2
fi
