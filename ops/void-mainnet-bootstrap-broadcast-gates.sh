#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"
PHASE_FILE="${TEXTFILE_DIR}/void_mainnet_bootstrap_phase.prom"
PLAN_FILE="${TEXTFILE_DIR}/void_mainnet_bootstrap_plan.prom"

echo "=== [broadcast-gates] VOID mainnet bootstrap broadcast eligibility ==="
echo "[cfg] PROM_URL    = ${PROM_URL}"
echo "[cfg] PHASE_FILE  = ${PHASE_FILE}"
echo "[cfg] PLAN_FILE   = ${PLAN_FILE}"
echo

if ! command -v curl >/dev/null 2>&1; then
  echo "[FATAL] curl not installed."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq not installed."
  exit 1
fi

query_scalar () {
  local q="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${q}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

phase_code="NaN"
phase_label="?"
phase_reason="?"

if sudo test -f "${PHASE_FILE}"; then
  phase_line="$(sudo grep '^void_mainnet_bootstrap_phase_code' "${PHASE_FILE}" 2>/dev/null || true)"
  if [ -n "${phase_line}" ]; then
    phase_code="$(printf '%s\n' "${phase_line}" | awk '{print $NF}' 2>/dev/null || echo "NaN")"
    phase_label="$(printf '%s\n' "${phase_line}" | sed -n 's/.*phase=\"\([^\"]*\)\".*/\1/p' 2>/dev/null || echo "?")"
    phase_reason="$(printf '%s\n' "${phase_line}" | sed -n 's/.*reason=\"\([^\"]*\)\".*/\1/p' 2>/dev/null || echo "?")"
  else
    echo "[warn] no phase metric line found in ${PHASE_FILE}"
  fi
else
  echo "[warn] phase file not found at ${PHASE_FILE}"
fi

plan_raw="NaN"
plan_reason="?"

if sudo test -f "${PLAN_FILE}"; then
  plan_line="$(sudo grep '^void_mainnet_bootstrap_plan_health ' "${PLAN_FILE}" 2>/dev/null || true)"
  if [ -n "${plan_line}" ]; then
    plan_raw="$(printf '%s\n' "${plan_line}" | awk '{print $2}' 2>/dev/null || echo "NaN")"
  else
    echo "[warn] no plan health metric line found in ${PLAN_FILE}"
  fi

  info_line="$(sudo grep '^void_mainnet_bootstrap_plan_health_info' "${PLAN_FILE}" 2>/dev/null || true)"
  if [ -n "${info_line}" ]; then
    plan_reason="$(printf '%s\n' "${info_line}" | sed -n 's/.*reason=\"\([^\"]*\)\".*/\1/p' 2>/dev/null || echo "?")"
  fi
else
  echo "[warn] plan file not found at ${PLAN_FILE}"
fi

overall_5m=$(query_scalar 'void:mainnet_overall:health:last_5m_v2')
pillars_5m=$(query_scalar 'void:mainnet_pillars:health:last_5m')
lastmile_5m=$(query_scalar 'void:mainnet_lastmile:health:last_5m')
safeboot_overall=$(query_scalar 'void_safeboot_overall_health')

echo "=== [inputs] ==="
echo "phase_code         = ${phase_code} (phase=\"${phase_label}\", reason=\"${phase_reason}\")"
echo "plan_raw           = ${plan_raw}   (reason=\"${plan_reason}\")"
echo "overall_5m         = ${overall_5m}"
echo "pillars_5m         = ${pillars_5m}"
echo "lastmile_5m        = ${lastmile_5m}"
echo "safeboot_overall   = ${safeboot_overall}"
echo

ok_phase=0
ok_plan=0
ok_overall=0
ok_pillars=0
ok_lastmile=0
ok_safeboot=0

if [ "${phase_code}" = "2" ] && [ "${phase_label}" = "B" ]; then
  ok_phase=1
fi

if [ "${plan_raw}" = "1" ] && [ "${plan_reason}" = "ok" ]; then
  ok_plan=1
fi

if [ "${overall_5m}" = "1" ]; then
  ok_overall=1
fi

if [ "${pillars_5m}" = "1" ]; then
  ok_pillars=1
fi

if [ "${lastmile_5m}" = "1" ]; then
  ok_lastmile=1
fi

if [ "${safeboot_overall}" = "1" ]; then
  ok_safeboot=1
fi

echo "=== [checks] ==="
echo "phase      (B / keys_locked_live_final) : ${ok_phase}"
echo "plan       (textfile == 1, reason=ok)   : ${ok_plan}"
echo "overall_5m (devnet+core+lastmile)       : ${ok_overall}"
echo "pillars_5m (devnet+core+manifest+safe)  : ${ok_pillars}"
echo "lastmile_5m                              : ${ok_lastmile}"
echo "safeboot_overall                         : ${ok_safeboot}"
echo

overall_ok=$(( ok_phase * ok_plan * ok_overall * ok_pillars * ok_lastmile * ok_safeboot ))

echo "=== [result] ==="
if [ "${overall_ok}" -eq 1 ]; then
  echo "[broadcast-gates] ELIGIBLE_TO_ARM=1"
  echo "[broadcast-gates] All broadcast preconditions satisfied. This does NOT broadcast; it only says the gates are green."
  exit 0
else
  echo "[broadcast-gates] ELIGIBLE_TO_ARM=0"
  echo "[broadcast-gates] One or more gates are NOT satisfied; do NOT arm broadcast."
  exit 1
fi
