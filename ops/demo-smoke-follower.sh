#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${ROOT:-$HOME/dev/void-node}"

echo "=== follower smoke ==="
OUT1="$(./ops/void-follow-once.sh)"
echo "$OUT1"

OUT2="$(./ops/void-follower-status.sh)"
echo "$OUT2"

echo "$OUT2" | grep -F 'lag=0' >/dev/null || {
  echo "FAIL follower lag nonzero"
  exit 1
}

echo "$OUT2" | grep -F 'main_health=ok' >/dev/null || {
  echo "FAIL main health not ok"
  exit 1
}

echo "$OUT2" | grep -F 'follower_health=ok' >/dev/null || {
  echo "FAIL follower health not ok"
  exit 1
}

echo "PASS follower synced"
