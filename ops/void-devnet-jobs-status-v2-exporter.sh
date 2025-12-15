#!/usr/bin/env bash
set -euo pipefail
cd "${REPO:-$HOME/dev/void-node}"

OUT_DIR="${OUT_DIR:-/var/lib/node_exporter/textfile_collector}"
V1_PROM="${1:-$OUT_DIR/void_devnet_jobs_status_v1.prom}"
OUT_PROM="${OUT_FILE:-$OUT_DIR/void_devnet_jobs_status_v2.prom}"

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
  echo "[jobs-status-v2] note: need sudo to write $OUT_PROM"
  sudo install -m 0644 "$TMP" "$OUT_PROM"
fi

rm -f "$TMP"
echo "[jobs-status-v2] wrote $OUT_PROM (gap=$GAP health=$HEALTH from v1: spool=$SPOOL_TOTAL chain=$CHAIN_TOTAL bad_flags=$BAD_FLAGS)"
