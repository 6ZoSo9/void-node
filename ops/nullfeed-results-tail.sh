#!/usr/bin/env bash
set -euo pipefail

RESULTS_FILE="data/nullfeed-results.jsonl"

job_id=""
channel=""
author=""
job_type=""
limit=40
raw=0

usage() {
  cat >&2 <<USAGE
usage: $0 [--job-id JOB_ID] [--channel '#general'] [--author NAME] \\
          [--type TYPE] [--limit N] [--raw]

Examples:
  # Last 40 results
  $0

  # Results for a given job
  $0 --job-id a4f6ef14d9713a71

  # Results for #general
  $0 --channel '#general'

  # Raw JSONL
  $0 --raw
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --job-id)
      job_id="${2-}"; shift 2 ;;
    --channel|-c)
      channel="${2-}"; shift 2 ;;
    --author|-a)
      author="${2-}"; shift 2 ;;
    --type)
      job_type="${2-}"; shift 2 ;;
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

if [ ! -s "$RESULTS_FILE" ]; then
  echo "[nullfeed-results-tail] no results yet ($RESULTS_FILE missing or empty)" >&2
  exit 0
fi

echo "[nullfeed-results-tail] file=$RESULTS_FILE job_id='${job_id}' channel='${channel}' author='${author}' type='${job_type}' limit=${limit}"

filtered=$(
  jq -c \
    --arg jid "$job_id" \
    --arg ch "$channel" \
    --arg au "$author" \
    --arg jt "$job_type" \
    '
    select(
      ($jid == "" or .jobId   == $jid)
      and ($jt  == "" or .type    == $jt)
      and ($ch  == "" or .channel == $ch)
      and ($au  == "" or .author  == $au)
    )
    ' "$RESULTS_FILE" \
  | tail -n "$limit" || true
)

if [ -z "$filtered" ]; then
  echo "[nullfeed-results-tail] no matches" >&2
  exit 0
fi

if [ "$raw" -eq 1 ]; then
  printf '%s\n' "$filtered"
else
  printf '%s\n' "$filtered" | jq .
fi
