#!/usr/bin/env bash
set -euo pipefail

MSG_ID=""
job_type="ai-task"
note=""

usage() {
  cat >&2 <<USAGE
usage: $0 --id MSG_ID [--type TYPE] [--note NOTE]

Create a local JobQueue v0 entry for a NullFeed message.

Examples:
  # Basic job for a message
  $0 --id d5d367e2a654b6f0

  # Explicit type + note
  $0 --id d5d367e2a654b6f0 --type summarize --note 'summarize this thread'
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --id)
      MSG_ID="${2-}"; shift 2 ;;
    --type)
      job_type="${2-}"; shift 2 ;;
    --note)
      note="${2-}"; shift 2 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "[ERR] unknown arg: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ -z "$MSG_ID" ]]; then
  echo "[ERR] --id MSG_ID is required" >&2
  usage
  exit 1
fi

MESSAGES_FILE="data/nullfeed-messages.jsonl"
JOBS_FILE="data/nullfeed-jobs.jsonl"

if [ ! -s "$MESSAGES_FILE" ]; then
  echo "[ERR] no messages file at $MESSAGES_FILE (post something first)" >&2
  exit 1
fi

# Get the message as a single compact JSON line
msg_line=$(
  ./ops/nullfeed-query.sh --id "$MSG_ID" --raw | tail -n1 || true
)

if [ -z "$msg_line" ]; then
  echo "[ERR] no message found with id=$MSG_ID" >&2
  exit 1
fi

# Generate a jobId (try openssl, fall back to hashing time)
jobId=$(
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 8
  else
    date +%s%N | sha256sum | cut -c1-16
  fi
)

ts_now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

job_json=$(
  printf '%s\n' "$msg_line" | jq -c \
    --arg jobId "$jobId" \
    --arg now "$ts_now" \
    --arg jt "$job_type" \
    --arg note "$note" \
    '
    {
      jobId: $jobId,
      createdAt: $now,
      status: "pending",
      type: $jt,
      note: $note,
      msg: .
    }
    '
)

mkdir -p "$(dirname "$JOBS_FILE")"
printf '%s\n' "$job_json" >> "$JOBS_FILE"

echo "[nullfeed-job-new] jobId=$jobId status=pending file=$JOBS_FILE"
