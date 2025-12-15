#!/usr/bin/env bash
set -euo pipefail

cd "${REPO:-$HOME/dev/void-node}"

OUT_PROM="${OUT_PROM:-/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom}"
V1_PROM="${V1_PROM:-/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v1.prom}"
CHAIN="${CHAIN:-devnet}"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL_FILE="${SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

metric_last_value() {
  local name="$1" file="$2"
  awk -v n="$name" '
    $1 ~ ("^" n "\\{") || $1 == n { v=$NF }
    END { if (v == "") exit 2; print v }
  ' "$file" 2>/dev/null || return 2
}

intify() { printf '%s\n' "$1" | awk '{printf "%.0f\n",$1}' 2>/dev/null || echo -1; }

SPOOL="-1"
CHAIN_TOTAL="-1"
BAD_FLAGS="-1"

# --- parse from v1 prom (best-effort) ---
if [ -f "$V1_PROM" ]; then
  SPOOL="$(metric_last_value "void_devnet_jobs_status_v1_jobs_in_spool" "$V1_PROM" 2>/dev/null || echo -1)"
  CHAIN_TOTAL="$(metric_last_value "void_devnet_jobs_status_v1_total_chain_jobs" "$V1_PROM" 2>/dev/null || echo -1)"
  BAD_FLAGS="$(metric_last_value "void_devnet_jobs_status_v1_bad_flags" "$V1_PROM" 2>/dev/null || echo -1)"
fi

# --- fallback spool from file ---
if [ "$SPOOL" = "-1" ] && [ -f "$SPOOL_FILE" ]; then
  # count non-empty lines
  SPOOL="$(awk 'NF{c++} END{print (c==""?0:c)}' "$SPOOL_FILE" 2>/dev/null || echo -1)"
fi

# --- fallback chain total from contract ---
if [ "$CHAIN_TOTAL" = "-1" ] && command -v jq >/dev/null 2>&1 && command -v cast >/dev/null 2>&1 && [ -f "$STATE_FILE" ]; then
  JOBQ="$(jq -r '..|.JobQueue? // empty | .address? // empty' "$STATE_FILE" 2>/dev/null | head -n 1 || true)"
  if [ -z "${JOBQ:-}" ] || [ "$JOBQ" = "null" ]; then
    # alternate common layouts
    JOBQ="$(jq -r '.JobQueue.address // .contracts.JobQueue.address // empty' "$STATE_FILE" 2>/dev/null || true)"
  fi
  if [ -n "${JOBQ:-}" ]; then
    # totalJobs()(uint256)
    CT="$(cast call "$JOBQ" "totalJobs()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null || true)"
    if [ -n "${CT:-}" ]; then CHAIN_TOTAL="$CT"; fi
  fi
fi

# If bad_flags wasn't parseable, default to 0? No: be strict.
HEALTH="0"
if [ "$BAD_FLAGS" != "-1" ]; then
  bi="$(intify "$BAD_FLAGS")"
  if [ "$bi" -eq 0 ]; then HEALTH="1"; else HEALTH="0"; fi
fi

# Compute gap if we have both spool and chain total
GAP="0"
si="$(intify "$SPOOL")"
ci="$(intify "$CHAIN_TOTAL")"
if [ "$si" -ge 0 ] && [ "$ci" -ge 0 ]; then
  if [ "$ci" -ge "$si" ]; then GAP="$((ci - si))"; else GAP="0"; fi
fi

RUN_TS="$(date +%s)"
TMP="/tmp/void_devnet_jobs_status_v2.prom.$$"
{
  echo '# HELP void_devnet_jobs_status_v2_gap chain_totalJobs() - spool_total (0 if spool exceeds chain total)'
  echo '# TYPE void_devnet_jobs_status_v2_gap gauge'
  printf 'void_devnet_jobs_status_v2_gap{chain="%s"} %s\n' "$CHAIN" "$GAP"

  echo '# HELP void_devnet_jobs_status_v2_health 1 if bad_flags==0 (from v1), else 0; if unknown then 0'
  echo '# TYPE void_devnet_jobs_status_v2_health gauge'
  printf 'void_devnet_jobs_status_v2_health{chain="%s"} %s\n' "$CHAIN" "$HEALTH"

  echo '# HELP void_devnet_jobs_status_v2_run_timestamp_seconds exporter run timestamp'
  echo '# TYPE void_devnet_jobs_status_v2_run_timestamp_seconds gauge'
  printf 'void_devnet_jobs_status_v2_run_timestamp_seconds{chain="%s"} %s\n' "$CHAIN" "$RUN_TS"

  echo '# HELP void_devnet_jobs_status_v2_diag_spool parsed spool count (v1 metric or fallback file)'
  echo '# TYPE void_devnet_jobs_status_v2_diag_spool gauge'
  printf 'void_devnet_jobs_status_v2_diag_spool{chain="%s"} %s\n' "$CHAIN" "$SPOOL"

  echo '# HELP void_devnet_jobs_status_v2_diag_chain_total parsed chain total (v1 metric or fallback cast)'
  echo '# TYPE void_devnet_jobs_status_v2_diag_chain_total gauge'
  printf 'void_devnet_jobs_status_v2_diag_chain_total{chain="%s"} %s\n' "$CHAIN" "$CHAIN_TOTAL"

  echo '# HELP void_devnet_jobs_status_v2_diag_bad_flags_from_v1 parsed bad_flags from v1 (or -1 if missing)'
  echo '# TYPE void_devnet_jobs_status_v2_diag_bad_flags_from_v1 gauge'
  printf 'void_devnet_jobs_status_v2_diag_bad_flags_from_v1{chain="%s"} %s\n' "$CHAIN" "$BAD_FLAGS"
} > "$TMP"

# write IN-PLACE to OUT_PROM; do not require /var dir write
WRITE_OK=0
if [ -e "$OUT_PROM" ] && [ -w "$OUT_PROM" ]; then
  cat "$TMP" > "$OUT_PROM" 2>/dev/null && WRITE_OK=1 || WRITE_OK=0
else
  : > "$OUT_PROM" 2>/dev/null || true
  if [ -w "$OUT_PROM" ]; then
    cat "$TMP" > "$OUT_PROM" 2>/dev/null && WRITE_OK=1 || WRITE_OK=0
  fi
fi

rm -f "$TMP" 2>/dev/null || true

if [ "$WRITE_OK" -ne 1 ]; then
  echo "[jobs-status-v2] ERR: failed to write $OUT_PROM (needs existing writable file)." >&2
  exit 0
fi

echo "[jobs-status-v2] wrote $OUT_PROM (gap=$GAP health=$HEALTH spool=$SPOOL chain=$CHAIN_TOTAL bad_flags=$BAD_FLAGS)"
exit 0
