#!/usr/bin/env bash
set -euo pipefail

# VOID devnet JobQueue/ReceiptRegistry flag sanity (v1 historic)
# NOTE: devnet v1 has known bad flag combos (hasResult/status) for some jobs.
# We expose bad_flags but do NOT make them fail health; health just checks that
# the spool matches chain total. See docs/JOBQUEUE-LIFECYCLE-SPEC.md.

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"
OUT_FILE="${OUT_FILE:-/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v1.prom}"

echo "[jobs-status] VOID devnet JobQueue/ReceiptRegistry flag sanity (v1 historic)"
echo "[jobs-status] repo=$REPO"
echo "[jobs-status] RPC_URL=$RPC_URL"
echo "[jobs-status] STATE_FILE=$STATE_FILE"
echo "[jobs-status] spool=$SPOOL"
echo "[jobs-status] out_file=$OUT_FILE"

# Defaults
SPOOL_COUNT=0
TOTAL_CHAIN_JOBS=0

TOTAL_CHAIN_RECEIPTS=0

# v2 semantics: exporter sanity = "no bad flags among scanned spool jobs"
# (legacy v1 health remains: spool_count == chain_totalJobs)
GAP_JOBS=$(( TOTAL_CHAIN_JOBS - SPOOL_COUNT ))
if [ "$GAP_JOBS" -lt 0 ]; then GAP_JOBS=0; fi
HEALTH_V2=1
POSTED=0
DONE=0
OTHER=0
BAD_FLAGS=0
# if any bad flags are observed during spool scan, v2 health becomes 0
HEALTH=0
HEALTH_V2=0
GAP_JOBS=0

write_prom_file() {
  local tmp out_dir
  out_dir=$(dirname "$OUT_FILE")
  sudo mkdir -p "$out_dir"

  tmp=$(mktemp /tmp/void_devnet_jobs_status_v1.prom.XXXXXX)

  {
    echo '# HELP void_devnet_jobs_status_v1_total total jobs tracked for flag sanity (spool-based)'
    echo '# TYPE void_devnet_jobs_status_v1_total gauge'
    printf 'void_devnet_jobs_status_v1_total{chain="devnet"} %s\n' "${SPOOL_COUNT:-0}"

    echo '# HELP void_devnet_jobs_status_v1_chain_total totalJobs() from JobQueue'
    echo '# TYPE void_devnet_jobs_status_v1_chain_total gauge'
    printf 'void_devnet_jobs_status_v1_chain_total{chain="devnet"} %s\n' "${TOTAL_CHAIN_JOBS:-0}"

    echo '# HELP void_devnet_jobs_status_v1_receipts_total totalReceipts() from ReceiptRegistry'
    echo '# TYPE void_devnet_jobs_status_v1_receipts_total gauge'
    printf 'void_devnet_jobs_status_v1_receipts_total{chain="devnet"} %s\n' "${TOTAL_CHAIN_RECEIPTS:-0}"

    echo '# HELP void_devnet_jobs_status_v1_posted jobs with status==1'
    echo '# TYPE void_devnet_jobs_status_v1_posted gauge'
    printf 'void_devnet_jobs_status_v1_posted{chain="devnet"} %s\n' "${POSTED:-0}"

    echo '# HELP void_devnet_jobs_status_v1_done jobs with status==2'
    echo '# TYPE void_devnet_jobs_status_v1_done gauge'
    printf 'void_devnet_jobs_status_v1_done{chain="devnet"} %s\n' "${DONE:-0}"

    echo '# HELP void_devnet_jobs_status_v1_other jobs with other status codes'
    echo '# TYPE void_devnet_jobs_status_v1_other gauge'
    printf 'void_devnet_jobs_status_v1_other{chain="devnet"} %s\n' "${OTHER:-0}"

    echo '# HELP void_devnet_jobs_status_v1_bad_flags jobs where hasResult/status combo looks inconsistent'
    echo '# TYPE void_devnet_jobs_status_v1_bad_flags gauge'
    printf 'void_devnet_jobs_status_v1_bad_flags{chain="devnet"} %s\n' "${BAD_FLAGS:-0}"

    echo '# HELP void_devnet_jobs_status_v1_health 1 if spool matches chain total (legacy v1 behavior), else 0'
    echo '# TYPE void_devnet_jobs_status_v1_health gauge'
    printf 'void_devnet_jobs_status_v1_health{chain="devnet"} %s\n' "${HEALTH:-0}"
  } > "$tmp"

  sudo mv "$tmp" "$OUT_FILE"
  sudo chown zoso:zoso "$OUT_FILE" || true
  sudo chmod 664 "$OUT_FILE" || true

  echo "[jobs-status] wrote metrics to $OUT_FILE"

# --- jobs-status v2 exporter (wired) ---
# v2 writes a separate prom file so v1 can remain legacy + unclobbered.
# Derive paths safely under `set -u` (never touch an unset var).
V1_PROM_PATH="${OUT_FILE:-${out_file:-/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v1.prom}}"
HOOK_REPO="${REPO:-${ROOT:-$(pwd)}}"
if [ -x "ops/void-devnet-jobs-status-v2-exporter.sh" ]; then
  (REPO="$HOOK_REPO" bash "ops/void-devnet-jobs-status-v2-exporter.sh" "$V1_PROM_PATH") || echo "[jobs-status] WARN: v2 exporter failed (non-fatal)" >&2
fi

}

if [ ! -f "$STATE_FILE" ]; then
  echo "[jobs-status] ERROR: missing state file $STATE_FILE" >&2
  HEALTH=0
  if [ "$BAD_FLAGS" -ne 0 ]; then HEALTH_V2=0; fi
write_prom_file


# --- v2 metrics (appended) ---
# v2 semantics: exporter sanity = "no bad flags among scanned spool jobs"
# (legacy v1 health remains: spool_count == chain_totalJobs)
OUT_PROM="${OUT_FILE:-/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v1.prom}"

GAP_JOBS=$(( ${TOTAL_CHAIN_JOBS:-0} - ${SPOOL_COUNT:-0} ))
if [ "$GAP_JOBS" -lt 0 ]; then GAP_JOBS=0; fi

HEALTH_V2=1
if [ "${BAD_FLAGS:-0}" -ne 0 ]; then HEALTH_V2=0; fi

{
  echo "# HELP void_devnet_jobs_status_v2_gap chain_totalJobs() - spool_total (0 if spool exceeds chain total)"
  echo "# TYPE void_devnet_jobs_status_v2_gap gauge"
  printf "void_devnet_jobs_status_v2_gap{chain=\"devnet\"} %s\n" "$GAP_JOBS"

  echo "# HELP void_devnet_jobs_status_v2_health 1 if exporter ran and no bad flag combos observed in scanned spool jobs, else 0"
  echo "# TYPE void_devnet_jobs_status_v2_health gauge"
  printf "void_devnet_jobs_status_v2_health{chain=\"devnet\"} %s\n" "$HEALTH_V2"

  echo "# HELP void_devnet_jobs_status_v2_run_timestamp_seconds exporter run timestamp"
  echo "# TYPE void_devnet_jobs_status_v2_run_timestamp_seconds gauge"
  printf "void_devnet_jobs_status_v2_run_timestamp_seconds{chain=\"devnet\"} %s\n" "$(date +%s)"
} >> "$OUT_PROM"


  exit 0
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE_FILE")
RECEIPTS=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE_FILE")

echo "[jobs-status] JobQueue=$JOBQUEUE"
echo "[jobs-status] ReceiptRegistry=$RECEIPTS"

if [ ! -f "$SPOOL" ]; then
  echo "[jobs-status] WARNING: spool file missing ($SPOOL); leaving totals=0, health=0"
  HEALTH=0
  write_prom_file
  exit 0
fi

SPOOL_COUNT=$(grep -E '^0x' "$SPOOL" | wc -l | tr -d ' ')
echo "[jobs-status] jobs_in_spool=$SPOOL_COUNT"

TOTAL_CHAIN_JOBS=$(cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL" | tr -d ' ')
TOTAL_CHAIN_RECEIPTS=$(cast call "$RECEIPTS" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL" | tr -d ' ')

BAD_FLAGS=0
POSTED=0
DONE=0
OTHER=0

while IFS=$' 	' read -r jobId _rest; do
  [ -z "$jobId" ] && continue
  case "$jobId" in
    0x*) ;;
    *) continue ;;
  esac

  hasResultRaw=$(cast call "$JOBQUEUE" 'hasResult(bytes32)(bool)' "$jobId" --rpc-url "$RPC_URL")
  statusRaw=$(cast call "$JOBQUEUE" 'getJobStatus(bytes32)(uint8)' "$jobId" --rpc-url "$RPC_URL")

  hasResult=0
  if echo "$hasResultRaw" | grep -qi 'true'; then
    hasResult=1
  fi

  status=$(echo "$statusRaw" | tr -d ' ')

  case "$status" in
    1) POSTED=$((POSTED+1)) ;;
    2) DONE=$((DONE+1)) ;;
    *) OTHER=$((OTHER+1)) ;;
  esac

  # We still count weird combos, but they don't fail health for legacy v1.
  if [ "$hasResult" -eq 1 ] && [ "$status" != "2" ]; then
    BAD_FLAGS=$((BAD_FLAGS+1))
  fi
  if [ "$hasResult" -eq 0 ] && [ "$status" = "2" ]; then
    BAD_FLAGS=$((BAD_FLAGS+1))
  fi
done < "$SPOOL"

# Legacy v1 health: just make sure the spool matches chain total.
HEALTH=1
if [ "$SPOOL_COUNT" -ne "$TOTAL_CHAIN_JOBS" ]; then
  HEALTH=0
fi

write_prom_file
exit 0


# --- v2 metrics (tail) ---
# We append at the end so later writes can never clobber these.
OUT_PROM="${OUT_FILE:-${out_file:-/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v1.prom}}"

GAP_JOBS=$(( ${TOTAL_CHAIN_JOBS:-0} - ${SPOOL_COUNT:-0} ))
if [ "$GAP_JOBS" -lt 0 ]; then GAP_JOBS=0; fi

HEALTH_V2=1
if [ "${BAD_FLAGS:-0}" -ne 0 ]; then HEALTH_V2=0; fi

{
  echo "# HELP void_devnet_jobs_status_v2_gap chain_totalJobs() - spool_total (0 if spool exceeds chain total)"
  echo "# TYPE void_devnet_jobs_status_v2_gap gauge"
  printf "void_devnet_jobs_status_v2_gap{chain=\"devnet\"} %s\n" "$GAP_JOBS"

  echo "# HELP void_devnet_jobs_status_v2_health 1 if exporter ran and no bad flag combos observed in scanned spool jobs, else 0"
  echo "# TYPE void_devnet_jobs_status_v2_health gauge"
  printf "void_devnet_jobs_status_v2_health{chain=\"devnet\"} %s\n" "$HEALTH_V2"

  echo "# HELP void_devnet_jobs_status_v2_run_timestamp_seconds exporter run timestamp"
  echo "# TYPE void_devnet_jobs_status_v2_run_timestamp_seconds gauge"
  printf "void_devnet_jobs_status_v2_run_timestamp_seconds{chain=\"devnet\"} %s\n" "$(date +%s)"
} >> "$OUT_PROM"
# --- /v2 metrics (tail) ---


