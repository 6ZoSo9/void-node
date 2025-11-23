#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://127.0.0.1:4100}"

echo "[lastmile-smoke] base=$BASE"

if ! command -v jq >/dev/null 2>&1; then
  echo "[lastmile-smoke] FATAL: jq not found in PATH" >&2
  exit 1
fi

HEAD_BEFORE=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number')
echo "[lastmile-smoke] head_before=$HEAD_BEFORE"

send_tx () {
  local idx="$1"
  local marker="mainnet-lastmile-$idx-$(date +%s)"
  echo "[lastmile-smoke] posting marker tx $idx ($marker)"

  local body
  body=$(jq -n --arg marker "$marker" '
    {
      kind: "marker-mainnet-lastmile",
      payload: { marker: $marker }
    }')

  # log status + body, don't -f so we can see errors
  local resp
  resp=$(curl -sS -w '\n[http_status:%{http_code}]\n' -X POST "$BASE/tx/submit" \
    -H 'Content-Type: application/json' \
    -d "$body")

  echo "[lastmile-smoke] /tx/submit resp tx $idx:"
  echo "$resp"
}

# 1) Push 3 marker txs through the real intake
send_tx 1
send_tx 2
send_tx 3

echo "[lastmile-smoke] waiting for seals..."
sleep 10

HEAD_AFTER=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number')
echo "[lastmile-smoke] head_after=$HEAD_AFTER"

if [ "$HEAD_AFTER" -lt "$HEAD_BEFORE" ]; then
  echo "[lastmile-smoke] WARNING: head_after($HEAD_AFTER) < head_before($HEAD_BEFORE)" >&2
fi

TOTAL=0
LAST_NONEMPTY=-1

START="$HEAD_BEFORE"
if [ "$START" -lt 0 ]; then
  START=0
fi

echo "[lastmile-smoke] scanning persisted txs in blocks $START..$HEAD_AFTER"
for N in $(seq "$START" "$HEAD_AFTER"); do
  RESP=$(curl -fsS "$BASE/dev/blocks/$N/txs/persisted" 2>/dev/null || echo '{"len":0}')
  LEN=$(echo "$RESP" | jq -r '.len // 0' 2>/dev/null || echo 0)
  echo "[lastmile-smoke] block $N len=$LEN"
  if [ "$LEN" -gt 0 ]; then
    TOTAL=$((TOTAL + LEN))
    LAST_NONEMPTY="$N"
  fi
done

echo "[lastmile-smoke] total_txs=$TOTAL last_nonempty=$LAST_NONEMPTY"

if [ "$LAST_NONEMPTY" -ge 0 ] && [ "$TOTAL" -gt 0 ]; then
  echo "[lastmile-smoke] inspecting txroot + header3 for block $LAST_NONEMPTY"

  TXROOT_JSON=$(curl -fsS "$BASE/dev/txroot/$LAST_NONEMPTY" 2>/dev/null || echo '{}')
  echo "[lastmile-smoke] dev/txroot/$LAST_NONEMPTY:"
  echo "$TXROOT_JSON" | jq .

  HDR_JSON=$(curl -fsS "$BASE/blocks/$LAST_NONEMPTY/header3" 2>/dev/null || echo '{}')
  echo "[lastmile-smoke] header3/$LAST_NONEMPTY:"
  echo "$HDR_JSON" | jq .
fi

if [ "$TOTAL" -gt 0 ]; then
  echo "[lastmile-smoke] RESULT: OK (non-empty persisted txs found after /tx/submit)"
  exit 0
else
  echo "[lastmile-smoke] RESULT: FAIL (no persisted txs found in $START..$HEAD_AFTER)"
  exit 1
fi
