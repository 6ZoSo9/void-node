#!/usr/bin/env bash
set -euo pipefail


umask 022

# VOID mainnet keys/roles → Prometheus textfile exporter
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TEXT_DIR="${TEXT_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${TEXT_DIR}/void-mainnet-keys.prom"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

cd "$ROOT"

echo "=== [keys-exporter] VOID mainnet keys/roles exporter ==="
echo "[keys-exporter] ROOT     = ${ROOT}"
echo "[keys-exporter] TEXT_DIR = ${TEXT_DIR}"
echo "[keys-exporter] OUT      = ${OUT}"

VAL=0
echo "[keys-exporter] running keys-health probe..."
if ./ops/void-mainnet-keys-health.sh >/dev/null 2>&1; then
  VAL=1
  echo "[keys-exporter] keys-health OK (VAL=${VAL})"
else
  VAL=0
  echo "[keys-exporter] keys-health FAILED, forcing VAL=${VAL}"
fi

{
  echo '# HELP void_mainnet_keys_roles_ok VOID mainnet keys/roles consistency (1 ok, 0 bad)'
  echo '# TYPE void_mainnet_keys_roles_ok gauge'
  echo "void_mainnet_keys_roles_ok ${VAL}"
} > "${TMP}"

echo
echo "[keys-exporter] candidate metric file:"
cat "${TMP}" || true

# First try: direct write as current user
if [ -w "${TEXT_DIR}" ]; then
  echo
  echo "[keys-exporter] TEXT_DIR is writable as $(id -un), moving file directly..."
  mv "${TMP}" "${OUT}"
  trap - EXIT
  ls -l "${OUT}" || true
  echo "[keys-exporter] wrote metric file (user) ${OUT}"
  echo "[keys-exporter] done."
  exit 0
fi

echo
echo "[keys-exporter] TEXT_DIR is NOT writable as $(id -un): ${TEXT_DIR}"
ls -ld "${TEXT_DIR}" || true

# Fallback: sudo install as root (same pattern as other root-owned textfiles)
echo "[keys-exporter] attempting sudo install to ${OUT}..."
sudo install -o root -g root -m 644 "${TMP}" "${OUT}"

trap - EXIT
ls -l "${OUT}" || true
echo "[keys-exporter] wrote metric file (sudo) ${OUT}"
echo "[keys-exporter] done (sudo path)."
# === [permfix] ensure node_exporter can read textfile outputs ===
if [ "${VOID_TEXTFILE_PERMFIX_DISABLE:-0}" = "1" ]; then
  :
else
  if [ "$(id -u)" -eq 0 ]; then
    for f in "/var/lib/node_exporter/textfile_collector/void_workcredits_devnet_pool.prom" "/var/lib/node_exporter/textfile_collector/void-mainnet-keys.prom" "/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom"; do [ -f "$f" ] && chmod 644 "$f" || true; done
  else
    for f in "/var/lib/node_exporter/textfile_collector/void_workcredits_devnet_pool.prom" "/var/lib/node_exporter/textfile_collector/void-mainnet-keys.prom" "/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom"; do [ -f "$f" ] && sudo chmod 644 "$f" || true; done
  fi
fi
