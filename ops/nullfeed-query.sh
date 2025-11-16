#!/usr/bin/env bash
set -euo pipefail

FILE="data/nullfeed-messages.jsonl"

channel=""
author=""
contains=""
id=""
limit=40
raw=0

usage() {
  cat >&2 <<USAGE
usage: $0 [--channel '#general'] [--author 'name'] [--contains 'text'] [--id MSG_ID] [--limit N] [--raw]

Examples:
  # Last 40 messages (any channel)
  $0

  # Last 20 from #general
  $0 --channel '#general' --limit 20

  # Messages from zoso in #voiddev containing 'gm'
  $0 --channel '#voiddev' --author 'zoso' --contains 'gm'

  # Lookup by ID
  $0 --id 4cb08e71bc2995b3

  # One-line JSON per result (good for piping)
  $0 --channel '#general' --raw
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel|-c)
      channel="${2-}"; shift 2 ;;
    --author|-a)
      author="${2-}"; shift 2 ;;
    --contains|-t)
      contains="${2-}"; shift 2 ;;
    --id)
      id="${2-}"; shift 2 ;;
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

if [ ! -s "$FILE" ]; then
  echo "[nullfeed-query] no messages yet ($FILE missing or empty)" >&2
  exit 0
fi

echo "[nullfeed-query] file=$FILE channel='${channel}' author='${author}' contains='${contains}' id='${id}' limit=${limit}"

# First jq: filter; output compact JSON for tail to operate on
filtered=$(
  jq -c \
    --arg ch "$channel" \
    --arg au "$author" \
    --arg q  "$contains" \
    --arg id "$id" \
    '
    select(
      ($id == "" or (.id // "") == $id)
      and ($ch == "" or .channel == $ch)
      and ($au == "" or .author == $au)
      and ($q  == "" or ((.body // "") | test($q; "i")))
    )
    ' "$FILE" \
  | tail -n "$limit" || true
)

if [ -z "$filtered" ]; then
  echo "[nullfeed-query] no matches" >&2
  exit 0
fi

if [ "$raw" -eq 1 ]; then
  # Raw compact JSON lines
  printf '%s\n' "$filtered"
else
  # Pretty-print JSON objects
  printf '%s\n' "$filtered" | jq .
fi
