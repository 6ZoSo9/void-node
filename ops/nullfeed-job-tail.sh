#!/usr/bin/env bash
set -euo pipefail

JOBS_FILE="data/nullfeed-jobs.jsonl"

status=""
channel=""
author=""
job_type=""
msg_id=""
job_id=""
limit=40
raw=0

usage() {
  cat >&2 <<USAGE
usage: $0 [--status STATUS] [--channel '#general'] [--author NAME] \\
          [--type TYPE] [--msg-id MSG_ID] [--job-id JOB_ID] [--limit N] [--raw]

Examples:
  # Last 40 jobs
  $0

  # Pending jobs only
  $0 --status pending

  # Jobs for #general
  $0 --channel '#general'

  # Jobs for a specific message
  $0 --msg-id d5d367e2a654b6f0

  # Jobs of type 'summarize'
  $0 --type summarize

  # Raw one-line JSON per job
  $0 --status pending --raw
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status)
      status="${2-}"; shift 2 ;;
    --channel|-c)
      channel="${2-}"; shift 2 ;;
    --author|-a)
      author="${2-}"; shift 2 ;;
    --type)
      job_type="${2-}"; shift 2 ;;
    --msg-id)
      msg_id="${2-}"; shift 2 ;;
    --job-id)
      job_id="${2-}"; shift 2 ;;
    --limit|-n)
      limit="${2-}"; shift 2 ;;
    --raw)
      raw=1; shift ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "[ERR] unknown arg: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [ ! -s "$JOBS_FILE" ]; then
  echo "[nullfeed-job-tail] no jobs yet ($JOBS_FILE missing or empty)" >&2
  exit 0
fi

echo "[nullfeed-job-tail] file=$JOBS_FILE status='${status}' channel='${channel}' author='${author}' type='${job_type}' msg_id='${msg_id}' job_id='${job_id}' limit=${limit}"

filtered=$(
  jq -c \
    --arg st "$status" \
    --arg ch "$channel" \
    --arg au "$author" \
    --arg jt "$job_type" \
    --arg mid "$msg_id" \
    --arg jid "$job_id" \
    '
    select(
      ($st  == "" or .status == $st)
      and ($jt  == "" or .type == $jt)
      and ($jid == "" or .jobId == $jid)
      and ($ch  == "" or ((.msg.channel // "") == $ch))
      and ($au  == "" or ((.msg.author  // "") == $au))
      and ($mid == "" or ((.msg.id      // "") == $mid))
    )
    ' "$JOBS_FILE" \
  | tail -n "$limit" || true
)

if [ -z "$filtered" ]; then
  echo "[nullfeed-job-tail] no matches" >&2
  exit 0
fi

if [ "$raw" -eq 1 ]; then
  printf '%s\n' "$filtered"
else
  printf '%s\n' "$filtered" | jq .
fi
