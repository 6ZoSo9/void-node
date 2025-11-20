#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL_FILE="${JOB_SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

TEXTFILE_DIR="${TEXTFILE_DIR:-$HOME/.cache/node-exporter-textfile}"
OUT_FILE="${OUT_FILE:-${TEXTFILE_DIR}/void_devnet_spool.prom}"

echo "[spool-health] repo=$REPO"
echo "[spool-health] rpc_url=$RPC_URL"
echo "[spool-health] state_file=$STATE_FILE"
echo "[spool-health] spool_file=$SPOOL_FILE"
echo "[spool-health] textfile_dir=$TEXTFILE_DIR"
echo "[spool-health] out_file=$OUT_FILE"

mkdir -p "$TEXTFILE_DIR"

TMP="$(mktemp)"
cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

if [ ! -f "$SPOOL_FILE" ]; then
  echo "[spool-health] WARNING: spool file missing, writing zeros."
  {
    echo "# HELP void_devnet_spool_jobs Jobs listed in VOID devnet job spool"
    echo "# TYPE void_devnet_spool_jobs gauge"
    echo 'void_devnet_spool_jobs{chain="devnet"} 0'
    echo "# HELP void_devnet_spool_pending Pending jobs in spool (per worker summary)"
    echo "# TYPE void_devnet_spool_pending gauge"
    echo 'void_devnet_spool_pending{chain="devnet"} 0'
    echo "# HELP void_devnet_spool_stale Stale/unknown jobs in spool (per worker summary)"
    echo "# TYPE void_devnet_spool_stale gauge"
    echo 'void_devnet_spool_stale{chain="devnet"} 0'
    echo "# HELP void_devnet_spool_health 1 if no stale jobs in spool, else 0"
    echo "# TYPE void_devnet_spool_health gauge"
    echo 'void_devnet_spool_health{chain="devnet"} 0'
  } >"$TMP"
  mv "$TMP" "$OUT_FILE"
  echo "[spool-health] wrote empty spool metrics to $OUT_FILE"
  exit 0
fi

# Count jobs in spool file (ignore comments and blank lines)
jobs_in_spool="$(grep -v '^[[:space:]]*#' "$SPOOL_FILE" | sed '/^[[:space:]]*$/d' | wc -l | awk '{print $1}')"
echo "[spool-health] jobs_in_spool(file)=$jobs_in_spool"

echo "[spool-health] running agent worker once to get summary..."
worker_output="$(./ops/void-devnet-agent-worker.sh 2>&1 || true)"
echo "$worker_output"

summary_line="$(printf '%s\n' "$worker_output" | grep '\[agent-worker\] summary:' | tail -n 1 || true)"

if [ -z "$summary_line" ]; then
  echo "[spool-health] ERROR: no summary line from worker; marking health=0" >&2
  pending="-1"
  stale="-1"
  health="0"
else
  echo "[spool-health] summary_line=$summary_line"

  pending="$(printf '%s\n' "$summary_line" \
    | sed -E 's/.*pending=([0-9]+).*/\1/' || echo "0")"

  stale="$(printf '%s\n' "$summary_line" \
    | sed -E 's/.*stale_unknown=([0-9]+).*/\1/' || echo "0")"

  if [[ "$pending" =~ ^[0-9]+$ ]] && [[ "$stale" =~ ^[0-9]+$ ]]; then
    :
  else
    echo "[spool-health] WARNING: failed to parse pending/stale; setting to -1" >&2
    pending="-1"
    stale="-1"
  fi

  if [ "$stale" = "0" ]; then
    health="1"
  else
    health="0"
  fi
fi

{
  echo "# HELP void_devnet_spool_jobs Jobs listed in VOID devnet job spool"
  echo "# TYPE void_devnet_spool_jobs gauge"
  echo "void_devnet_spool_jobs{chain=\"devnet\"} $jobs_in_spool"

  echo "# HELP void_devnet_spool_pending Pending jobs in spool (per worker summary)"
  echo "# TYPE void_devnet_spool_pending gauge"
  echo "void_devnet_spool_pending{chain=\"devnet\"} $pending"

  echo "# HELP void_devnet_spool_stale Stale/unknown jobs in spool (per worker summary)"
  echo "# TYPE void_devnet_spool_stale gauge"
  echo "void_devnet_spool_stale{chain=\"devnet\"} $stale"

  echo "# HELP void_devnet_spool_health 1 if no stale jobs in spool, else 0"
  echo "# TYPE void_devnet_spool_health gauge"
  echo "void_devnet_spool_health{chain=\"devnet\"} $health"
} >"$TMP"

mv "$TMP" "$OUT_FILE"
echo "[spool-health] wrote metrics to $OUT_FILE"

# Ensure textfile is world-readable so node_exporter can scrape it
if [ -n "${OUT_FILE:-}" ] && [ -f "$OUT_FILE" ]; then
  chmod 644 "$OUT_FILE" 2>/dev/null || true
fi
