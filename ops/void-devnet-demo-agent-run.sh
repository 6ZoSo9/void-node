#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO/docs"
JOBS_FILE="$DOCS_DIR/VOID-DEVNET-DEMO-JOBS.jsonl"
RECEIPTS_FILE="$DOCS_DIR/VOID-DEVNET-DEMO-RECEIPTS.jsonl"

mkdir -p "$DOCS_DIR"

if [[ ! -f "$JOBS_FILE" ]] || [[ ! -s "$JOBS_FILE" ]]; then
  echo "[demo-agent] no jobs found in $JOBS_FILE"
  exit 0
fi

# Ensure receipts file exists
touch "$RECEIPTS_FILE"

# Compute first job id that does NOT yet have a receipt
pending_id="$(
  jq -s '
    (.[0] // []) as $jobs
    | (.[1] // []) as $receipts
    | ($receipts | map(.jobId) | unique) as $done
    | ($jobs
        | map(select(.id as $i | ($done | index($i)) | not))
        | sort_by(.id)
        | (.[0].id // empty)
      )
  ' \
    <(jq -s '.' "$JOBS_FILE") \
    <(jq -s '.' "$RECEIPTS_FILE") 2>/dev/null
)"

if [[ -z "${pending_id:-}" ]]; then
  echo "[demo-agent] no pending jobs (all jobs already have receipts)"
  exit 0
fi

ts="$(date -Iseconds)"
status="ok"
note="demo agent processed job locally (no on-chain effect)"

jq -nc \
  --argjson jobId "$pending_id" \
  --arg ts "$ts" \
  --arg status "$status" \
  --arg note "$note" \
  '{jobId:$jobId, ts:$ts, status:$status, note:$note}' >> "$RECEIPTS_FILE"

echo "[demo-agent] wrote receipt for jobId=$pending_id"
echo "[demo-agent] tail of $RECEIPTS_FILE:"
tail -n 3 "$RECEIPTS_FILE" || true
