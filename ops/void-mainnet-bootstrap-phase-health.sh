#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[phase-health] prom_url=${PROM_URL}"

echo
echo "[phase-health] query recording: void:mainnet_bootstrap_phase_code:last_5m"
RAW_JSON="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_bootstrap_phase_code:last_5m")" || {
  echo "[phase-health] ERROR: curl to Prometheus failed" >&2
  exit 1
}

COUNT="$(printf '%s\n' "$RAW_JSON" | jq '.data.result | length')" || {
  echo "[phase-health] ERROR: jq failed while reading result length" >&2
  printf '%s\n' "$RAW_JSON"
  exit 1
}

if [[ "$COUNT" -ne 1 ]]; then
  echo "[phase-health] ERROR: expected exactly 1 series, got ${COUNT}" >&2
  printf '%s\n' "$RAW_JSON"
  exit 1
fi

PHASE_LABEL="$(printf '%s\n' "$RAW_JSON" | jq -r '.data.result[0].metric.phase // "UNKNOWN"')"
CODE_STR="$(printf '%s\n' "$RAW_JSON" | jq -r '.data.result[0].value[1] // "NaN"')"

if ! [[ "$CODE_STR" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; then
  echo "[phase-health] ERROR: phase code is not numeric: ${CODE_STR}" >&2
  printf '%s\n' "$RAW_JSON"
  exit 1
fi

CODE_INT="$(printf '%s\n' "$CODE_STR" | awk '{printf "%d\n", $1}')"

echo "[phase-health] phase label = ${PHASE_LABEL}"
echo "[phase-health] phase code  = ${CODE_INT}"

# Current expectation: Phase B (PLAN-ONLY) == code 2
EXPECTED_PHASE="B"
EXPECTED_CODE=2

if [[ "$PHASE_LABEL" != "$EXPECTED_PHASE" ]]; then
  echo "[phase-health] ERROR: unexpected phase label: got=${PHASE_LABEL} expected=${EXPECTED_PHASE}" >&2
  exit 1
fi

if [[ "$CODE_INT" -ne "$EXPECTED_CODE" ]]; then
  echo "[phase-health] ERROR: unexpected phase code: got=${CODE_INT} expected=${EXPECTED_CODE}" >&2
  exit 1
fi

echo
echo "[phase-health] RESULT: OK (phase=${PHASE_LABEL}, code=${CODE_INT})"
