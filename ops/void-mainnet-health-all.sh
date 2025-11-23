#!/usr/bin/env bash
set -euo pipefail

PROM="http://127.0.0.1:9090"

echo "[mainnet-health] Prometheus: ${PROM}"

q() {
  local expr="$1"
  curl -fsS "${PROM}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "null"'
}

status_ok=1

echo
echo "=== [step 1] mainnet_core health ==="
core_health="$(q 'void:mainnet_core:health:last_5m')"
echo "void:mainnet_core:health:last_5m = ${core_health}"

if [ "${core_health}" != "1" ]; then
  echo "[mainnet-health] ERROR: mainnet_core health != 1"
  status_ok=0
else
  echo "[mainnet-health] OK: mainnet_core health == 1"
fi

echo
echo "=== [step 2] mainnet_overall health ==="
overall_health="$(q 'max(void:mainnet_overall:health:last_5m)')"
echo "max(void:mainnet_overall:health:last_5m) = ${overall_health}"

if [ "${overall_health}" != "1" ]; then
  echo "[mainnet-health] WARN: mainnet_overall health != 1 (check tokenomics / lastmile / safeboot pillars)"
  status_ok=0
else
  echo "[mainnet-health] OK: mainnet_overall health == 1"
fi

echo
echo "=== [step 3] proposer auto-loop ==="
prop_enabled="$(q 'void_proposer_auto_enabled')"
prop_ms="$(q 'void_proposer_auto_ms')"
echo "void_proposer_auto_enabled = ${prop_enabled}"
echo "void_proposer_auto_ms      = ${prop_ms}"

if [ "${prop_enabled}" != "1" ]; then
  echo "[mainnet-health] ERROR: proposer auto-loop is NOT enabled"
  status_ok=0
else
  echo "[mainnet-health] OK: proposer auto-loop enabled"
fi

if [ "${prop_ms}" != "2000" ]; then
  echo "[mainnet-health] WARN: proposer tick ms != 2000 (current: ${prop_ms})"
  status_ok=0
else
  echo "[mainnet-health] OK: proposer tick ms == 2000"
fi

echo
echo "=== [step 4] last-mile non-empty window ==="
lm_ratio="$(q 'void:mainnet_lastmile_nonempty_ratio:last_10m')"
lm_window="$(q 'void:mainnet_lastmile_window_size:last')"
lm_expect="$(q 'void:mainnet_lastmile_expect_nonempty:last')"

echo "void:mainnet_lastmile_nonempty_ratio:last_10m = ${lm_ratio}"
echo "void:mainnet_lastmile_window_size:last        = ${lm_window}"
echo "void:mainnet_lastmile_expect_nonempty:last    = ${lm_expect}"

# Interpret:
# - If expect==0 → observe-only, do not fail on ratio.
# - If expect==1 and window>=64 and ratio==0 → fail hard.
if [ "${lm_expect}" = "1" ]; then
  if [ "${lm_window}" != "null" ] && [ "${lm_window}" -ge 64 ] 2>/dev/null; then
    if [ "${lm_ratio}" = "0" ]; then
      echo "[mainnet-health] ERROR: last-mile expects non-empty but ratio==0 in window>=64"
      status_ok=0
    else
      echo "[mainnet-health] OK: last-mile expects non-empty and ratio>0"
    fi
  else
    echo "[mainnet-health] WARN: last-mile expect_nonempty=1 but window<64 or null"
    status_ok=0
  fi
else
  echo "[mainnet-health] INFO: last-mile gate is OFF (EXPECT_NONEMPTY=0); not enforcing ratio."
fi

echo
echo "=== [step 5] safeboot overall (from main node exporter) ==="
safeboot_overall="$(q 'void:safeboot:overall')"
echo "void:safeboot:overall = ${safeboot_overall}"

if [ "${safeboot_overall}" != "1" ]; then
  echo "[mainnet-health] WARN: safeboot overall != 1 (check safeboot pillar alerts)"
  status_ok=0
else
  echo "[mainnet-health] OK: safeboot overall == 1"
fi

echo
if [ "${status_ok}" -eq 1 ]; then
  echo "[mainnet-health] RESULT: OK (mainnet_core + overall + proposer + last-mile + safeboot look green)"
  exit 0
else
  echo "[mainnet-health] RESULT: NOT OK (see errors/warnings above)"
  exit 1
fi
