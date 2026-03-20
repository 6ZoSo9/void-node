#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MAIN="${MAIN:-http://127.0.0.1:4100}"
FOLLOW="${FOLLOW:-http://127.0.0.1:4101}"

m_health="$(curl -fsS --max-time 3 "$MAIN/health" 2>/dev/null || true)"
f_health="$(curl -fsS --max-time 3 "$FOLLOW/health" 2>/dev/null || true)"
m_head="$(curl -fsS --max-time 3 "$MAIN/head.txt" 2>/dev/null || echo ERR)"
f_head="$(curl -fsS --max-time 3 "$FOLLOW/head.txt" 2>/dev/null || echo ERR)"

printf 'main_head=%s\n' "$m_head"
printf 'follower_head=%s\n' "$f_head"

if [[ "$m_head" =~ ^-?[0-9]+$ ]] && [[ "$f_head" =~ ^-?[0-9]+$ ]]; then
  printf 'lag=%s\n' "$(( m_head - f_head ))"
else
  printf 'lag=ERR\n'
fi

if [[ -n "$m_health" ]]; then
  printf 'main_health=ok\n'
else
  printf 'main_health=err\n'
fi

if [[ -n "$f_health" ]]; then
  printf 'follower_health=ok\n'
else
  printf 'follower_health=err\n'
fi

echo
systemctl --user --no-pager --full status void-follower-once.timer -n 8 || true
echo
systemctl --user --no-pager --full status void-follower-once.service -n 12 || true
