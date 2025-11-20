#!/usr/bin/env bash
set -euo pipefail

echo "[spool-refresh] starting..."

REPO="${REPO:-$(pwd)}"
cd "$REPO"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL_FILE="${JOB_SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

if [ ! -f "$STATE_FILE" ]; then
  echo "[spool-refresh] ERROR: state file not found: $STATE_FILE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '.JobQueue.address // empty' "$STATE_FILE")
if [ -z "$JOBQUEUE" ] || [ "$JOBQUEUE" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[spool-refresh] ERROR: JobQueue.address missing/zero in $STATE_FILE" >&2
  exit 1
fi

echo "[spool-refresh] repo=$REPO"
echo "[spool-refresh] rpc_url=$RPC_URL"
echo "[spool-refresh] state_file=$STATE_FILE"
echo "[spool-refresh] spool_file=$SPOOL_FILE"
echo "[spool-refresh] JobQueue=$JOBQUEUE"

TMP_LOGS="$(mktemp)"
TMP_SPOOL="$(mktemp)"

cleanup() {
  rm -f "$TMP_LOGS" "$TMP_SPOOL"
}
trap cleanup EXIT

EVENT_SIG="JobPosted(bytes32,address,address,bytes32)"
echo "[spool-refresh] EVENT_SIG=$EVENT_SIG"

echo "[spool-refresh] querying JobPosted logs via cast..."
cast logs \
  --rpc-url "$RPC_URL" \
  --address "$JOBQUEUE" \
  "$EVENT_SIG" \
  --from-block 0 \
  --to-block latest \
  --json > "$TMP_LOGS"

JOBS_FOUND=$(jq 'length' "$TMP_LOGS")
echo "[spool-refresh] raw logs count=$JOBS_FOUND"

{
  echo "# VOID devnet job spool (one jobId per line)"
  echo "# regenerated: $(date -Iseconds)"
  jq -r '.[] | .topics[1]' "$TMP_LOGS" 2>/dev/null | sort -u
} > "$TMP_SPOOL"

JOBS_UNIQUE=$(tail -n +3 "$TMP_SPOOL" | wc -l | tr -d ' ')
echo "[spool-refresh] unique jobIds=$JOBS_UNIQUE"

if [ "$JOBS_UNIQUE" -eq 0 ]; then
  echo "[spool-refresh] WARNING: no JobPosted events found; leaving existing spool untouched."
  echo "[spool-refresh] tmp spool contents:"
  sed -n '1,10p' "$TMP_SPOOL" || true
  exit 0
fi

mkdir -p "$(dirname "$SPOOL_FILE")"

echo "[spool-refresh] writing new spool -> $SPOOL_FILE"
mv "$SPOOL_FILE" "$SPOOL_FILE.bak.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
mv "$TMP_SPOOL" "$SPOOL_FILE"

echo "[spool-refresh] done."
