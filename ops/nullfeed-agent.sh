#!/usr/bin/env bash
set -euo pipefail

CHANNEL="${1:-#general}"

# Always operate from repo root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
MSG_LOG="${MSG_LOG:-data/nullfeed-messages.jsonl}"
STATE_DIR="${STATE_DIR:-data/nullfeed-agent-state}"

mkdir -p "$STATE_DIR"

# IDs from env, default to 1 (your demo setup)
AGENT_ID="${AGENT_ID:-1}"
MODEL_ID="${MODEL_ID:-1}"
DATASET_ID="${DATASET_ID:-1}"

LAST_FILE="$STATE_DIR/${CHANNEL#\#}.last_job"
if [[ -f "$LAST_FILE" ]]; then
  LAST_JOB="$(cat "$LAST_FILE" 2>/dev/null || echo 0)"
else
  LAST_JOB=0
fi

echo "[agent] watching channel=${CHANNEL} AGENT_ID=${AGENT_ID} MODEL_ID=${MODEL_ID} DATASET_ID=${DATASET_ID} last_job=${LAST_JOB}" >&2
echo "[agent] STATE=${STATE} MSG_LOG=${MSG_LOG} STATE_DIR=${STATE_DIR}" >&2

while true; do
  if [[ -s "$MSG_LOG" ]]; then
    # Collect new messages for this channel with jobId > LAST_JOB
    mapfile -t NEW_ROWS < <(
      jq -c --arg ch "$CHANNEL" --argjson last "$LAST_JOB" '
        select(.channel == $ch and .jobId > $last)
        | {jobId, body}
      ' "$MSG_LOG" 2>/dev/null || true
    )

    if ((${#NEW_ROWS[@]} > 0)); then
      for row in "${NEW_ROWS[@]}"; do
        jid="$(jq -r '.jobId' <<<"$row")"
        body="$(jq -r '.body'   <<<"$row")"
        summary="summary: ${body}"

        echo "[agent] new message jobId=${jid} channel=${CHANNEL}" >&2
        echo "        body=${body}" >&2
        echo "        summary=${summary}" >&2

        if ./ops/nullfeed-receipt.sh "$jid" "$CHANNEL" "$summary"; then
          echo "[agent] receipt OK for jobId=${jid}" >&2
        else
          echo "[agent] WARN: receipt FAILED for jobId=${jid}" >&2
        fi

        LAST_JOB="$jid"
        echo "$LAST_JOB" >"$LAST_FILE"
      done
    fi
  fi

  sleep 5
done
