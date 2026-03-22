#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
MAIN_BASE="${MAIN_BASE:-http://127.0.0.1:4100}"
FOLLOWER_BASE="${FOLLOWER_BASE:-http://127.0.0.1:4101}"
FOLLOWER_SRC="${FOLLOWER_SRC:-http://127.0.0.1:4100}"

cd "$ROOT"

echo "=== follower smoke ==="

systemctl --user start void-follower-once.service

ok=0
for _ in $(seq 1 30); do
  MAIN_HEAD="$(curl -fsS --max-time 3 "$MAIN_BASE/head.txt" 2>/dev/null || true)"
  FOLLOW_HEAD="$(curl -fsS --max-time 3 "$FOLLOWER_BASE/head.txt" 2>/dev/null || true)"
  if [ -n "${MAIN_HEAD:-}" ] && [ -n "${FOLLOW_HEAD:-}" ] && [ "$FOLLOW_HEAD" -ge "$MAIN_HEAD" ]; then
    ok=1
    break
  fi
  sleep 1
done

MAIN_HEAD="$(curl -fsS --max-time 3 "$MAIN_BASE/head.txt")"
FOLLOW_HEAD="$(curl -fsS --max-time 3 "$FOLLOWER_BASE/head.txt")"
echo "main_head=$MAIN_HEAD"
echo "follower_head=$FOLLOW_HEAD"
echo "lag=$((MAIN_HEAD - FOLLOW_HEAD))"

MAIN_HEALTH="$(curl -fsS --max-time 3 "$MAIN_BASE/health" >/dev/null 2>&1 && echo ok || echo fail)"
FOLLOW_HEALTH="$(curl -fsS --max-time 3 "$FOLLOWER_BASE/health" >/dev/null 2>&1 && echo ok || echo fail)"
echo "main_health=$MAIN_HEALTH"
echo "follower_health=$FOLLOW_HEALTH"

echo
systemctl --user status void-follower-once.timer --no-pager -n 20 || true
echo
systemctl --user status void-follower-once.service --no-pager -n 40 || true

echo
echo "=== follower smoke: recent logs ==="
journalctl --user -u void-follower-once.service --no-pager -n 40 || true

if [ "$MAIN_HEALTH" != "ok" ] || [ "$FOLLOW_HEALTH" != "ok" ]; then
  echo "FAIL follower smoke health check failed"
  exit 1
fi

if [ "$ok" != "1" ]; then
  echo "FAIL follower did not converge to source head from $FOLLOWER_SRC"
  exit 1
fi

if ! systemctl --user is-active --quiet void-follower-once.timer; then
  echo "FAIL follower timer not active"
  exit 1
fi

if systemctl --user is-failed --quiet void-follower-once.service; then
  echo "FAIL follower service is in failed state"
  exit 1
fi

echo "PASS follower synced"
