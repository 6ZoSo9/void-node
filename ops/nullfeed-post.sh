#!/usr/bin/env bash
set -euo pipefail

FILE="data/nullfeed-messages.jsonl"
mkdir -p "$(dirname "$FILE")"

if [ "$#" -lt 2 ]; then
  echo "usage: $0 '#channel' [author] 'message body...'" >&2
  echo "  examples:" >&2
  echo "    $0 '#general' 'gm from VOID devnet – local v0 test'" >&2
  echo "    $0 '#general' 'zoso' 'gm from VOID devnet – local v0 test'" >&2
  exit 1
fi

channel="$1"
shift

if [ "$#" -eq 1 ]; then
  author="${USER:-unknown}"
  body="$1"
else
  author="$1"
  shift
  body="$*"
fi

ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Short stable ID (first 16 hex chars of sha256(ts+channel+author+body))
id="$(printf '%s' "$ts $channel $author $body" | sha256sum | cut -c1-16)"

tmp="$(mktemp)"
jq -nc \
  --arg id "$id" \
  --arg ts "$ts" \
  --arg ch "$channel" \
  --arg au "$author" \
  --arg body "$body" \
  '{id:$id, ts:$ts, channel:$ch, author:$au, body:$body, app:"nullfeed-local-v0"}' \
  >"$tmp"

cat "$tmp" >>"$FILE"
rm -f "$tmp"

echo "[nullfeed-local] wrote message:"
echo "  file:    $FILE"
echo "  id:      $id"
echo "  ts:      $ts"
echo "  channel: $channel"
echo "  author:  $author"
echo "  body:    $body"
