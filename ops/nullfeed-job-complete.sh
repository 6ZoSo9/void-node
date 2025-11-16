#!/usr/bin/env bash
set -euo pipefail

JOBS_FILE="data/nullfeed-jobs.jsonl"

status="done"
job_id=""
note=""
result=""

usage() {
  cat >&2 <<USAGE
usage: $0 --job-id JOB_ID [--status STATUS] [--note NOTE] [--result TEXT]

STATUS is typically: pending | done | error

Examples:
  # Mark job as done
  $0 --job-id a4f6ef14d9713a71 --status done

  # Mark job as error with a note
  $0 --job-id a4f6ef14d9713a71 --status error --note 'failed to process'

  # Mark job done and attach a result string
  $0 --job-id a4f6ef14d9713a71 --status done --result 'simulated summary'
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --job-id)
      job_id="${2-}"; shift 2 ;;
    --status)
      status="${2-}"; shift 2 ;;
    --note)
      note="${2-}"; shift 2 ;;
    --result)
      result="${2-}"; shift 2 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "[ERR] unknown arg: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ -z "$job_id" ]]; then
  echo "[ERR] --job-id is required" >&2
  usage
  exit 1
fi

if [ ! -s "$JOBS_FILE" ]; then
  echo "[ERR] jobs file missing or empty: $JOBS_FILE" >&2
  exit 1
fi

# Ensure the job exists before rewriting
if ! jq -e --arg jid "$job_id" 'select(.jobId == $jid) | .jobId' "$JOBS_FILE" >/dev/null; then
  echo "[ERR] no job found with jobId=$job_id" >&2
  exit 1
fi

tmp=$(mktemp "${JOBS_FILE}.XXXXXX")

jq -c \
  --arg jid "$job_id" \
  --arg st "$status" \
  --arg note "$note" \
  --arg res "$result" \
  '
  if .jobId == $jid then
    .status = $st
    | (if $note != "" then .note = $note else . end)
    | (if $res  != "" then .result = $res  else . end)
  else
    .
  end
  ' "$JOBS_FILE" > "$tmp"

mv "$tmp" "$JOBS_FILE"

echo "[nullfeed-job-complete] jobId=$job_id status=$status updated"
