#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
cd "${ROOT:-$HOME/dev/void-node}"

echo "=== demo start main ==="
systemctl --user daemon-reload
systemctl --user restart void-node.service

ok=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "$BASE/head.txt" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 1
done

if [ "$ok" -ne 1 ]; then
  echo "FAIL main node did not come up on $BASE"
  systemctl --user status void-node.service -n 80 --no-pager || true
  exit 1
fi

echo "head=$(curl -fsS --max-time 3 "$BASE/head.txt")"
echo "PASS main started"
