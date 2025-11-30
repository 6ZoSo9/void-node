#!/usr/bin/env bash
set -euo pipefail

PHASE_FILE="${PHASE_FILE:-/var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_phase.prom}"

echo "[phase-health] textfile mode only (no Prometheus query)"
echo "[phase-health] phase textfile: ${PHASE_FILE}"

if [[ ! -f "${PHASE_FILE}" ]]; then
  echo "[phase-health] ERROR: phase textfile not found at ${PHASE_FILE}" >&2
  exit 1
fi

LINE="$(sudo cat "${PHASE_FILE}" | grep 'void_mainnet_bootstrap_phase_code' | tail -n1 || true)"

if [[ -z "${LINE}" ]]; then
  echo "[phase-health] ERROR: no void_mainnet_bootstrap_phase_code line found in textfile" >&2
  exit 1
fi

PHASE_LABEL="$(echo "${LINE}" | sed -n 's/.*phase=\"\([^\"]*\)\".*/\1/p')"
REASON_LABEL="$(echo "${LINE}" | sed -n 's/.*reason=\"\([^\"]*\)\".*/\1/p')"
PHASE_CODE="$(echo "${LINE}" | awk '{print $NF}' || echo "NaN")"

if [[ -z "${PHASE_LABEL}" ]]; then
  PHASE_LABEL="UNKNOWN"
fi

if [[ -z "${REASON_LABEL}" ]]; then
  REASON_LABEL="unknown"
fi

echo "[phase-health] phase label = ${PHASE_LABEL}"
echo "[phase-health] reason      = ${REASON_LABEL}"
echo "[phase-health] phase code  = ${PHASE_CODE}"
echo
echo "[phase-health] RESULT: OK (textfile truth)"
