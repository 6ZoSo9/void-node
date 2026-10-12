#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
paths=(
  "/health"
  "/datanet/v1/status"
  "/datanet/v1/receipts/status"
)
fail=0
for p in "${paths[@]}"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 1 "$BASE$p" || echo 000)"
  printf "%s  %s\n" "$code" "$p"
  [ "$code" = "200" ] || fail=1
done
exit "$fail"
