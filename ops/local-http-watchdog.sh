#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
SERVICE="${SERVICE:-void-node.service}"
MAX_TIME="${MAX_TIME:-8}"
OUT="${OUT:-/tmp/void-node-watchdog-last.json}"

probe() {
  local url="$1"
  curl -fsS --max-time "$MAX_TIME" "$url" >/dev/null
}

ts() { date +%s; }

STATUS="ok"
WHY="healthy"

if ! probe "$BASE/health"; then
  STATUS="fail"
  WHY="health_timeout"
elif ! probe "$BASE/head.txt"; then
  STATUS="fail"
  WHY="head_timeout"
elif ! probe "$BASE/participant?account=watchdog&ts=$(ts)"; then
  STATUS="fail"
  WHY="participant_timeout"
fi

if [ "$STATUS" = "ok" ]; then
  printf '{\n  "ok": true,\n  "ts": %s,\n  "base": "%s",\n  "service": "%s",\n  "status": "%s"\n}\n' \
    "$(ts)" "$BASE" "$SERVICE" "$WHY" > "$OUT"
  echo "[ok] watchdog: node responsive"
  exit 0
fi

echo "[warn] watchdog: $WHY -> restarting $SERVICE"
systemctl --user restart "$SERVICE"
sleep 8

POST="ok"
POST_WHY="recovered"
if ! probe "$BASE/health"; then
  POST="fail"
  POST_WHY="health_timeout_after_restart"
elif ! probe "$BASE/head.txt"; then
  POST="fail"
  POST_WHY="head_timeout_after_restart"
elif ! probe "$BASE/participant?account=watchdog&ts=$(ts)"; then
  POST="fail"
  POST_WHY="participant_timeout_after_restart"
fi

if [ "$POST" = "ok" ]; then
  printf '{\n  "ok": true,\n  "ts": %s,\n  "base": "%s",\n  "service": "%s",\n  "status": "%s"\n}\n' \
    "$(ts)" "$BASE" "$SERVICE" "$POST_WHY" > "$OUT"
  echo "[ok] watchdog: service recovered after restart"
  exit 0
fi

printf '{\n  "ok": false,\n  "ts": %s,\n  "base": "%s",\n  "service": "%s",\n  "status": "%s"\n}\n' \
  "$(ts)" "$BASE" "$SERVICE" "$POST_WHY" > "$OUT"
echo "[fail] watchdog: service still unhealthy after restart"
exit 1
