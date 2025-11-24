#!/usr/bin/env bash
set -euo pipefail

MAIN_URL="${MAIN_URL:-http://127.0.0.1:4100}"
SAFE_URL="${SAFE_URL:-http://127.0.0.1:4104}"

# IMPORTANT: default to node_exporter's configured textfile_collector dir
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${TEXTFILE_DIR}/void_safeboot_head.prom"

mkdir -p "${TEXTFILE_DIR}"

echo "[safeboot-head-exporter] MAIN_URL=${MAIN_URL} SAFE_URL=${SAFE_URL}"
echo "[safeboot-head-exporter] TEXTFILE_DIR=${TEXTFILE_DIR}"
echo

get_head() {
  local url="$1"
  curl -fsS "${url}/head.txt"
}

main_head="$(get_head "${MAIN_URL}" || echo "")"
safe_head="$(get_head "${SAFE_URL}" || echo "")"

if [[ -z "${main_head}" || -z "${safe_head}" ]]; then
  health=0
  gap=""
else
  health=1
  gap=$(( main_head - safe_head ))
fi

if [[ -n "${gap}" && "${gap}" -le 100 ]]; then
  synced=1
else
  synced=0
fi

echo "  main_head  = ${main_head:-NA}"
echo "  safe_head  = ${safe_head:-NA}"
echo "  gap        = ${gap:-NA}"
echo "  health     = ${health}"
echo "  synced     = ${synced}"
echo

{
  echo "# HELP void_safeboot_head_main Mainnet head as seen by safeboot exporter"
  echo "# TYPE void_safeboot_head_main gauge"
  [[ -n "${main_head}" ]] && echo "void_safeboot_head_main{chain=\"mainnet\",chainId=\"2050\"} ${main_head}" || true
  echo
  echo "# HELP void_safeboot_head_safe Safeboot head number"
  echo "# TYPE void_safeboot_head_safe gauge"
  [[ -n "${safe_head}" ]] && echo "void_safeboot_head_safe{chain=\"mainnet-safeboot\",chainId=\"2050\"} ${safe_head}" || true
  echo
  echo "# HELP void_safeboot_head_gap Difference main_head - safeboot_head"
  echo "# TYPE void_safeboot_head_gap gauge"
  [[ -n "${gap}" ]] && echo "void_safeboot_head_gap{chain=\"mainnet\",chainId=\"2050\"} ${gap}" || true
  echo
  echo "# HELP void_safeboot_head_health 1 if heads readable, 0 otherwise"
  echo "# TYPE void_safeboot_head_health gauge"
  echo "void_safeboot_head_health{chain=\"mainnet\",chainId=\"2050\"} ${health}"
  echo
  echo "# HELP void_safeboot_head_synced 1 if gap <= 100, 0 otherwise"
  echo "# TYPE void_safeboot_head_synced gauge"
  echo "void_safeboot_head_synced{chain=\"mainnet\",chainId=\"2050\",threshold=\"100\"} ${synced}"
} > "${OUT}.tmp"

mv "${OUT}.tmp" "${OUT}"
chmod 644 "${OUT}"

echo "[safeboot-head-exporter] wrote ${OUT}"
