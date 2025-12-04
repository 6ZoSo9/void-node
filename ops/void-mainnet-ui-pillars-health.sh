#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_PATH="${TEXTFILE_PATH:-}"

cd "$REPO_ROOT"

echo "=== [ui-pillars-health] VOID mainnet UI pillars health (WC + Dashboard) ==="

overall=1

echo
echo "=== [ui-pillars-health] 1) Work Credits v0 health ==="
if TEXTFILE_PATH="" REPO_ROOT="$REPO_ROOT" ./ops/void-mainnet-work-credits-health.sh; then
  wc_health=1
else
  echo "[ui-pillars-health] wc-health FAILED"
  wc_health=0
  overall=0
fi

echo
echo "=== [ui-pillars-health] 2) Dashboard v0 health ==="
if TEXTFILE_PATH="" REPO_ROOT="$REPO_ROOT" ./ops/void-mainnet-dashboard-health.sh; then
  dashboard_health=1
else
  echo "[ui-pillars-health] dashboard-health FAILED"
  dashboard_health=0
  overall=0
fi

echo
echo "=== [ui-pillars-health] summary ==="
echo "[ui-pillars-health] wc_health=${wc_health}"
echo "[ui-pillars-health] dashboard_health=${dashboard_health}"
echo "[ui-pillars-health] overall=${overall}"

if [[ -n "${TEXTFILE_PATH}" ]]; then
  echo
  echo "=== [ui-pillars-health] writing textfile to ${TEXTFILE_PATH} ==="
  tmp="$(mktemp)"

  {
    echo "# HELP void_mainnet_ui_work_credits_health Work Credits UI layer health (1 ok, 0 bad)"
    echo "# TYPE void_mainnet_ui_work_credits_health gauge"
    echo "void_mainnet_ui_work_credits_health ${wc_health}"
    echo "# HELP void_mainnet_ui_dashboard_health Main Dashboard UI layer health (1 ok, 0 bad)"
    echo "# TYPE void_mainnet_ui_dashboard_health gauge"
    echo "void_mainnet_ui_dashboard_health ${dashboard_health}"
    echo "# HELP void_mainnet_ui_pillars_health Combined UI pillars health (1 ok, 0 bad)"
    echo "# TYPE void_mainnet_ui_pillars_health gauge"
    echo "void_mainnet_ui_pillars_health ${overall}"
  } > "${tmp}"

  if [[ "${EUID}" -eq 0 ]]; then
    mv "${tmp}" "${TEXTFILE_PATH}"
    chmod 644 "${TEXTFILE_PATH}"
  else
    if mv "${tmp}" "${TEXTFILE_PATH}" 2>/dev/null; then
      :
    else
      sudo mv "${tmp}" "${TEXTFILE_PATH}"
      sudo chmod 644 "${TEXTFILE_PATH}"
    fi
  fi

  echo "[ui-pillars-health] wrote ${TEXTFILE_PATH}"
fi
