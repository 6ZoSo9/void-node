#!/usr/bin/env bash
set -euo pipefail

HTTP_PORT="${HTTP_PORT:-4100}"
P2P_PORT="${P2P_PORT:-4700}"

pat=":(${HTTP_PORT}|${P2P_PORT})[[:space:]]"
pids="$(ss -ltnp 2>/dev/null | grep -E "$pat" | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u || true)"

if [ -z "${pids:-}" ]; then
  echo "void-node-live-listeners: no stale listeners on $HTTP_PORT/$P2P_PORT"
  exit 0
fi

echo "void-node-live-listeners: killing stale pids: $pids"
kill $pids 2>/dev/null || true
sleep 2

pids2="$(ss -ltnp 2>/dev/null | grep -E "$pat" | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u || true)"
if [ -n "${pids2:-}" ]; then
  echo "void-node-live-listeners: force killing stale pids: $pids2"
  kill -9 $pids2 2>/dev/null || true
  sleep 1
fi

ss -ltnp 2>/dev/null | grep -E "$pat" && {
  echo "void-node-live-listeners: ports still occupied"
  exit 1
} || true

echo "void-node-live-listeners: ports clear"
