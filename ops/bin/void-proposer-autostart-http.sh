#!/usr/bin/env bash
HTTP_PORT="${HTTP_PORT:-4100}"
PROPOSER_TICK_MS="${PROPOSER_TICK_MS:-2000}"
echo "[autostart] wait for HTTP..." >&2
for i in {1..60}; do
  if curl -fsS "http://127.0.0.1:${HTTP_PORT}/proposer/auto/status2" >/dev/null 2>&1 || \
     curl -fsS "http://127.0.0.1:${HTTP_PORT}/metrics/void/proposer.v3b.prom" >/dev/null 2>&1; then
    echo "[autostart] enabling proposer" >&2
    curl -fsS -X POST "http://127.0.0.1:${HTTP_PORT}/proposer/auto/start?ms=${PROPOSER_TICK_MS}&dry=0&confirm=proposerAutoStart" >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 1
done
exit 0
