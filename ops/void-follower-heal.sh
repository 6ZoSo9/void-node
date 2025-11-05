#!/usr/bin/env bash
set -euo pipefail
PROM="http://127.0.0.1:9090"
JOB="void-follower-v4"
FOLLOWER_HTTP="http://127.0.0.1:4101"
PEER="http://127.0.0.1:4100"

q() { curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$1" | jq -r '.data.result[0].value[1] // empty'; }

up=$(q "up{job=\"$JOB\"}")
drift1=$(q "void_follower_drift")
sleep 2
drift2=$(q "void_follower_drift")

# quick sanity if Prom temporarily empty
[[ -z "$up" ]] && exit 0

if [[ "$up" != "1" ]] || { [[ -n "$drift1" && -n "$drift2" ]] && awk 'BEGIN{exit !(('"${drift1:-0}"'>50 && '"${drift2:-0}"'>50))}'; }; then
  # try gentle nudge first
  curl -fsS -X POST "$FOLLOWER_HTTP/follower/start?peer=$PEER&intervalMs=1000" >/dev/null || true
  sleep 2
  up2=$(q "up{job=\"$JOB\"}") || true
  drift3=$(q "void_follower_drift") || true
  if [[ "$up2" != "1" ]] || { [[ -n "$drift3" ]] && awk 'BEGIN{exit !('"${drift3:-0}"'>50)}'; }; then
    systemctl --user restart 'void-node@bootstrap-1' || true
  fi
fi
