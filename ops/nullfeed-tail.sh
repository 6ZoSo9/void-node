#!/usr/bin/env bash
set -euo pipefail

FILE="data/nullfeed-messages.jsonl"
channel="${1-}"

if [ ! -s "$FILE" ]; then
  echo "[nullfeed-local] no messages yet ($FILE missing or empty)" >&2
  exit 0
fi

if [ -z "$channel" ]; then
  echo "[nullfeed-local] showing last 40 messages (all channels)"
  tail -n 40 "$FILE" | jq .
else
  echo "[nullfeed-local] showing last 40 messages for channel=$channel"
  # filter by channel then show last 40
  jq -c --arg ch "$channel" 'select(.channel == $ch)' "$FILE" | tail -n 40 | jq .
fi
