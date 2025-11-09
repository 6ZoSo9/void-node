#!/usr/bin/env bash
set -euo pipefail

HTTP="${HTTP_PORT:-4100}"
STATE_DIR="${HOME}/.cache/void/auto-rescue"
LAST="${STATE_DIR}/head.last"
OUT="${TFD:-/var/lib/node_exporter/textfile_collector}/void_autorescue.prom"
TMP="${OUT}.tmp.$$"
STALL_SEC="${STALL_SEC:-30}"

# read helpers
get_head() { curl -fsS "http://127.0.0.1:${HTTP}/head.txt" 2>/dev/null | head -1 | tr -d '\r'; }
get_enabled() { curl -fsS "http://127.0.0.1:${HTTP}/proposer/auto/status2" 2>/dev/null | jq -r '.enabled' || echo 0; }

mkdir -p "$(dirname "$OUT")" "$STATE_DIR"

now=$(date +%s)
head=$(get_head || echo -1)
en=$(get_enabled)

# init last if missing
if [[ ! -f "$LAST" ]]; then
  printf "%s %s\n" "$head" "$now" > "$LAST"
fi

read last_head last_ts < "$LAST" || { last_head=-2; last_ts=$now; }

stall=0
rescue=0
ok=0

if [[ "$en" = "1" ]]; then
  if [[ "$head" -gt "$last_head" ]]; then
    ok=1
    printf "%s %s\n" "$head" "$now" > "$LAST"
  else
    # no progress
    if [[ $(( now - last_ts )) -ge "$STALL_SEC" ]]; then
      stall=1
      # Try known rescue endpoints (any that exist)
      for u in \
        "/proposer/hook/run?name=rescue-v1&max=10" \
        "/proposer/hook/run2?name=rescue-v1&max=10" \
        "/proposer/rescue/run?name=rescue-v1&max=10"
      do
        if curl -fsS -m 3 -X POST "http://127.0.0.1:${HTTP}${u}" >/dev/null 2>&1; then
          rescue=1
          break
        fi
      done
      # bump the last_ts so we don’t hammer
      printf "%s %s\n" "$head" "$now" > "$LAST"
    fi
  fi
fi

# Emit metrics
{
  echo "# HELP void_autorescue_ok Last run saw progress (1/0)"
  echo "# TYPE void_autorescue_ok gauge"
  echo "void_autorescue_ok ${ok}"
  echo "# HELP void_autorescue_stall Stall detected (1/0)"
  echo "# TYPE void_autorescue_stall gauge"
  echo "void_autorescue_stall ${stall}"
  echo "# HELP void_autorescue_fired_total Number of rescues fired"
  echo "# TYPE void_autorescue_fired_total counter"
  # Keep a tiny counter file
  CNT_FILE="${STATE_DIR}/fired.count"
  [[ -f "$CNT_FILE" ]] || echo 0 > "$CNT_FILE"
  if [[ "$rescue" = "1" ]]; then
    cnt=$(( $(cat "$CNT_FILE") + 1 ))
    echo "$cnt" > "$CNT_FILE"
  fi
  echo "void_autorescue_fired_total $(cat "$CNT_FILE")"
} > "$TMP"
mv -f "$TMP" "$OUT"
