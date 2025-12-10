#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
COUNT="${COUNT:-200}"      # how many txs to send
SLEEP_SEC="${SLEEP_SEC:-0.1}"  # pause between txs

echo "=== [config] ==="
echo "BASE=$BASE COUNT=$COUNT SLEEP_SEC=$SLEEP_SEC"

echo
echo "=== [HEAD BEFORE] ==="
HEAD_BEFORE_JSON="$(curl -fsS "$BASE/blocks/latest/number2.json" || echo '{}')"
echo "$HEAD_BEFORE_JSON"
HEAD_BEFORE="$(echo "$HEAD_BEFORE_JSON" | jq -r '.number // -1' 2>/dev/null || echo -1)"
echo "HEAD_BEFORE=$HEAD_BEFORE"

RUN_ID="$(date +%s)"

echo
echo "=== [SENDING $COUNT TXs] ==="
for i in $(seq 1 "$COUNT"); do
  ID="devload-${RUN_ID}-$(printf '%04d' "$i")"
  DATA="0xdeadbeef_devload_${RUN_ID}_$(printf '%04d' "$i")"
  echo "--- tx $i / $COUNT (id=$ID) ---"
  curl -fsS -X POST "$BASE/tx/submit" \
    -H 'Content-Type: application/json' \
    -d "{\"id\":\"$ID\",\"data\":\"$DATA\"}" \
    || echo "[submit failed $i]"
  sleep "$SLEEP_SEC"
done

echo
echo "=== [WAIT 15s FOR SEALS] ==="
sleep 15

echo
echo "=== [HEAD AFTER] ==="
HEAD_AFTER_JSON="$(curl -fsS "$BASE/blocks/latest/number2.json" || echo '{}')"
echo "$HEAD_AFTER_JSON"
HEAD_AFTER="$(echo "$HEAD_AFTER_JSON" | jq -r '.number // -1' 2>/dev/null || echo -1)"
echo "HEAD_AFTER=$HEAD_AFTER"

# Optional: inspect last few blocks for persisted txs
if [ "$HEAD_AFTER" -ge 0 ]; then
  START=$((HEAD_AFTER-5))
  if [ "$START" -lt 0 ]; then START=0; fi

  for n in $(seq "$START" "$HEAD_AFTER"); do
    echo
    echo "=== [block $n] persisted txs ==="
    curl -fsS "$BASE/dev/blocks/$n/txs/persisted" \
      | jq '{n:'"$n"', len: (.txs | length)}' || echo "[persisted endpoint failed]"

    echo "--- header3 ---"
    curl -fsS "$BASE/blocks/$n/header3" \
      | jq '{number, txCount, txRoot}' || echo "[header3 failed]"
  done
fi
