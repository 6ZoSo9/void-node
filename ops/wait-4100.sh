#!/usr/bin/env bash
set -euo pipefail
for i in {1..30}; do
  if curl -fsS --max-time 1 http://127.0.0.1:4100/health >/dev/null 2>&1; then
    echo "[ok] 4100 up"
    exit 0
  fi
  sleep 0.5
done
echo "[FAIL] 4100 still down"
exit 1
