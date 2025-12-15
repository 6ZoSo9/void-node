#!/usr/bin/env bash
set -euo pipefail
cd "${REPO:-$HOME/dev/void-node}"

OUT_DIR="${OUT_DIR:-/var/lib/node_exporter/textfile_collector}"
V1_PROM="${1:-$OUT_DIR/void_devnet_jobs_status_v1.prom}"
OUT_PROM="${OUT_FILE:-$OUT_DIR/void_devnet_jobs_status_v2.prom}"
# --- v2 cache default (no-prompt) ---
V2_TEXTFILE_REAL_DEFAULT="/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom"
V2_TEXTFILE_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/node-exporter-textfile"
V2_TEXTFILE_CACHE="$V2_TEXTFILE_CACHE_DIR/void_devnet_jobs_status_v2.prom"
mkdir -p "$V2_TEXTFILE_CACHE_DIR"
# Keep a real target for optional install (caller can override OUT_PROM_REAL).
OUT_PROM_REAL="${OUT_PROM_REAL:-$V2_TEXTFILE_REAL_DEFAULT}"
# If script defaulted OUT_PROM to the real path, redirect writes to cache.
if [ "${OUT_PROM:-}" = "$V2_TEXTFILE_REAL_DEFAULT" ]; then
  OUT_PROM="$V2_TEXTFILE_CACHE"
fi



TMP_PROM="$(mktemp /tmp/void_devnet_jobs_status_v2.prom.XXXXXX)"
SUDO_CMD=""
if [ ! -w "$(dirname "$OUT_PROM")" ] || [ -f "$OUT_PROM" -a ! -w "$OUT_PROM" ]; then
  SUDO_CMD="sudo -n"
fi


if [ ! -f "$V1_PROM" ]; then
  echo "[jobs-status-v2] ERR: v1 prom not found: $V1_PROM" >&2
  exit 1
fi

read -r SPOOL_TOTAL CHAIN_TOTAL BAD_FLAGS < <(awk '
  BEGIN{st=-1; ct=-1; bf=-1;}
  $1 ~ /^void_devnet_jobs_status_v1_total/ {st=$2}
  $1 ~ /^void_devnet_jobs_status_v1_chain_total/ {ct=$2}
  $1 ~ /^void_devnet_jobs_status_v1_bad_flags/ {bf=$2}
  END{
    if(st<0) st=0;
    if(ct<0) ct=0;
    if(bf<0) bf=0;
    printf "%d %d %d\n", st, ct, bf;
  }
' "$V1_PROM")

GAP=$(( CHAIN_TOTAL - SPOOL_TOTAL ))
if [ "$GAP" -lt 0 ]; then GAP=0; fi

HEALTH=1
if [ "$BAD_FLAGS" -ne 0 ]; then HEALTH=0; fi

TS="$(date +%s)"
TMP="/tmp/void_devnet_jobs_status_v2.prom.$$"

{
  echo "# HELP void_devnet_jobs_status_v2_gap chain_totalJobs() - spool_total (0 if spool exceeds chain total)"
  echo "# TYPE void_devnet_jobs_status_v2_gap gauge"
  printf "void_devnet_jobs_status_v2_gap{chain=\"devnet\"} %s\n" "$GAP"

  echo "# HELP void_devnet_jobs_status_v2_health 1 if no bad flag combos observed among scanned spool jobs, else 0"
  echo "# TYPE void_devnet_jobs_status_v2_health gauge"
  printf "void_devnet_jobs_status_v2_health{chain=\"devnet\"} %s\n" "$HEALTH"

  echo "# HELP void_devnet_jobs_status_v2_run_timestamp_seconds exporter run timestamp"
  echo "# TYPE void_devnet_jobs_status_v2_run_timestamp_seconds gauge"
  printf "void_devnet_jobs_status_v2_run_timestamp_seconds{chain=\"devnet\"} %s\n" "$TS"
} > "$TMP"

if install -m 0644 "$TMP" "$OUT_PROM" 2>/dev/null; then
  :
else
  echo "[jobs-status-v2] note: need sudo -n to write $OUT_PROM"
  sudo -n install -m 0644 "$TMP" "$OUT_PROM"
fi

rm -f "$TMP"
echo "[jobs-status-v2] wrote $OUT_PROM (gap=$GAP health=$HEALTH from v1: spool=$SPOOL_TOTAL chain=$CHAIN_TOTAL bad_flags=$BAD_FLAGS)"

# --- v2 best-effort install (no-prompt) ---
if [ -n "${OUT_PROM_REAL:-}" ] && [ -n "${OUT_PROM:-}" ] && [ "$OUT_PROM" != "$OUT_PROM_REAL" ] && [ -f "$OUT_PROM" ]; then
  if [ -w "$(dirname "$OUT_PROM_REAL")" ] && { [ ! -f "$OUT_PROM_REAL" ] || [ -w "$OUT_PROM_REAL" ]; }; then
    install -m 0644 "$OUT_PROM" "$OUT_PROM_REAL" || true
  elif sudo -n true 2>/dev/null; then
    sudo -n install -m 0644 "$OUT_PROM" "$OUT_PROM_REAL" || true
  else
    echo "[jobs-status-v2] NOTE: cannot install v2 prom to $OUT_PROM_REAL (no sudo -n). cache at $OUT_PROM" >&2
  fi
fi

