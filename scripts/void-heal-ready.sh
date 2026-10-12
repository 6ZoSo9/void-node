#!/usr/bin/env bash
set -euo pipefail
BASE='http://localhost:4100'
PROM='http://127.0.0.1:9090/api/v1/query'

# Head increase over 2m
INC=$(curl -fsS --get "$PROM" --data-urlencode 'query=increase(void_head_number{job="void-head"}[2m])' \
  | jq -r '.data.result[0].value[1] // 0')

# Ready bit (prefer void_ready_bit, fallback to void_ready)
BIT=$(curl -fsS "$BASE/__void/ready.prom" \
  | awk '/^void_ready_bit /{print $2} /^void_ready /{print $2}' | head -n1)
BIT=${BIT:-0}

if awk "BEGIN{exit !(($INC+0) > 0 && ($BIT+0) == 1)}"; then
  echo "[heal] OK inc=$INC bit=$BIT"
  exit 0
fi

echo "[heal] NOT READY (inc=$INC bit=$BIT) -> nudge"
# Safe, idempotent nudges:
curl -fsS -X POST "$BASE/proposer/auto/start?ms=2000&dry=0&confirm=proposerAutoStart" >/dev/null || true
curl -fsS -X POST "$BASE/blocks/empty-policy/set?enabled=true&fill=true" >/dev/null || true
curl -fsS -X POST "$BASE/tx/merge/cap/set?enabled=true&max=2" >/dev/null || true
curl -fsS -X POST "$BASE/tx/dev/burst?n=4" >/dev/null || true
