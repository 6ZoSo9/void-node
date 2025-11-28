#!/usr/bin/env bash
set -euo pipefail

CONFIG="config/void-mainnet-bootstrap-mainnet.live.json"
RPC="http://127.0.0.1:8545"
PROM_URL="http://127.0.0.1:9090"

usage() {
  cat <<'EOF'
Usage: ops/void-mainnet-bootstrap-safety-mainnet.sh [--config PATH] [--rpc URL] [--prom-url URL]

Runs a MAINNET-STYLE SAFETY CHECK:

  1) MAINNET-LINT against the given config
  2) MAINNET-DRYRUN (PLAN) against the given config + RPC
  3) Prometheus checks:
       - void:mainnet_overall:health:last_5m_v2
       - void:mainnet_pillars:health:last_5m
       - void:mainnet_lastmile:health:last_5m
       - void_mainnet_tokenomics_health

All four gauges must be == 1 or this script exits non-zero.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="${2:-}"
      shift 2
      ;;
    --rpc)
      RPC="${2:-}"
      shift 2
      ;;
    --prom-url|--prom)
      PROM_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

echo "=== VOID mainnet bootstrap SAFETY-MAINNET ==="
echo "[info] CONFIG   = ${CONFIG}"
echo "[info] RPC      = ${RPC}"
echo "[info] PROM_URL = ${PROM_URL}"
echo

if [[ ! -f "${CONFIG}" ]]; then
  echo "[FATAL] Config file not found: ${CONFIG}" >&2
  exit 1
fi

echo "=== [STEP 1] MAINNET-LINT (offline) ==="
./ops/void-mainnet-bootstrap-mainnet-lint.sh --config "${CONFIG}"
echo

echo "=== [STEP 2] MAINNET-DRYRUN (PLAN against RPC) ==="
./ops/void-mainnet-bootstrap-mainnet-dryrun.sh --config "${CONFIG}" --rpc "${RPC}"
echo

echo "=== [STEP 3] Prometheus mainnet health gauges ==="

_query_scalar() {
  local q="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${q}" \
    | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null
}

OVERALL=$(_query_scalar 'void:mainnet_overall:health:last_5m_v2')
PILLARS=$(_query_scalar 'void:mainnet_pillars:health:last_5m')
LASTMILE=$(_query_scalar 'void:mainnet_lastmile:health:last_5m')
TOKEN=$(_query_scalar 'void_mainnet_tokenomics_health')

echo "void:mainnet_overall:health:last_5m_v2 = ${OVERALL}"
echo "void:mainnet_pillars:health:last_5m     = ${PILLARS}"
echo "void:mainnet_lastmile:health:last_5m    = ${LASTMILE}"
echo "void_mainnet_tokenomics_health          = ${TOKEN}"
echo

fail=0

if [[ "${OVERALL}" != "1" ]]; then
  echo "[FATAL] mainnet_overall(last_5m_v2) != 1 (got ${OVERALL})" >&2
  fail=1
fi
if [[ "${PILLARS}" != "1" ]]; then
  echo "[FATAL] mainnet_pillars(last_5m) != 1 (got ${PILLARS})" >&2
  fail=1
fi
if [[ "${LASTMILE}" != "1" ]]; then
  echo "[FATAL] mainnet_lastmile(last_5m) != 1 (got ${LASTMILE})" >&2
  fail=1
fi
if [[ "${TOKEN}" != "1" ]]; then
  echo "[FATAL] mainnet_tokenomics_health != 1 (got ${TOKEN})" >&2
  fail=1
fi

if [[ "${fail}" -ne 0 ]]; then
  echo
  echo "=== [RESULT] SAFETY-MAINNET FAILED ==="
  echo "One or more mainnet gauges != 1. Investigate before proceeding."
  exit 1
fi

echo "=== [RESULT] SAFETY-MAINNET PASSED ==="
echo "MAINNET-LINT + MAINNET-DRYRUN OK and all mainnet gauges == 1."
