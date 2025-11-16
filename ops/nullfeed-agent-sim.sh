#!/usr/bin/env bash
set -euo pipefail

JOBS_FILE="data/nullfeed-jobs.jsonl"
RESULTS_FILE="data/nullfeed-results.jsonl"
AGENT_NAME="nullfeed-agent-sim-v0"

job_id=""
job_type_override=""

# Args: optional --job-id <id>, --type <type>
while [ $# -gt 0 ]; do
  case "$1" in
    --job-id)
      job_id="$2"; shift 2;;
    --type)
      job_type_override="$2"; shift 2;;
    *)
      echo "[agent-sim] unknown arg: $1" >&2
      exit 1;;
  esac
done

if [ ! -f "$JOBS_FILE" ]; then
  echo "[agent-sim] no jobs file: $JOBS_FILE"
  exit 0
fi

pick_job_id() {
  # Oldest pending by createdAt (lexicographic ISO sort is fine)
  jq -r 'select(.status=="pending") | .createdAt + " " + .jobId' "$JOBS_FILE" \
    | sort \
    | head -n1 \
    | awk '{print $2}'
}

if [ -z "$job_id" ]; then
  job_id="$(pick_job_id || true)"
fi

if [ -z "$job_id" ] || [ "$job_id" = "null" ]; then
  echo "[agent-sim] no pending jobs, nothing to do"
  exit 0
fi

job_json="$(jq -c --arg id "$job_id" 'select(.jobId == $id)' "$JOBS_FILE" | head -n1 || true)"

if [ -z "$job_json" ]; then
  echo "[agent-sim] job not found for jobId=$job_id"
  exit 1
fi

status="$(echo "$job_json" | jq -r '.status')"
if [ "$status" != "pending" ]; then
  echo "[agent-sim] jobId=$job_id status=$status (not pending); skipping"
  exit 0
fi

job_type="$(echo "$job_json" | jq -r '.type')"
[ -n "$job_type_override" ] && job_type="$job_type_override"

channel="$(echo "$job_json" | jq -r '.msg.channel')"
author="$(echo "$job_json" | jq -r '.msg.author')"
body="$(echo "$job_json" | jq -r '.msg.body')"

echo "[agent-sim] processing jobId=$job_id type=$job_type channel=$channel author=$author"

result="(simulated-$job_type) channel=$channel author=$author body=\"$body\""
echo "[agent-sim] result: $result"

tmp="$JOBS_FILE.$$"
jq --arg id "$job_id" --arg res "$result" '
  if .jobId == $id then
    .status = "done" |
    .note = "processed by nullfeed-agent-sim-v0" |
    .result = $res
  else
    .
  end
' "$JOBS_FILE" > "$tmp"
mv "$tmp" "$JOBS_FILE"

ts="$(date -u --iso-8601=seconds)"

jq -n \
  --arg jobId "$job_id" \
  --arg ts "$ts" \
  --arg agent "$AGENT_NAME" \
  --arg type "$job_type" \
  --arg channel "$channel" \
  --arg author "$author" \
  --arg body "$body" \
  --arg result "$result" \
  '{
     jobId: $jobId,
     ts: $ts,
     agent: $agent,
     type: $type,
     channel: $channel,
     author: $author,
     body: $body,
     result: $result
   }' >> "$RESULTS_FILE"

echo "[agent-sim] wrote result to $RESULTS_FILE"
