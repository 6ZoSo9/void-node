#!/usr/bin/env bash
set -euo pipefail
THRESH="${1:-3000}"
URL="http://127.0.0.1:9090/api/v1/query"
while :; do
  VAL="$(curl -fsS --get "$URL" --data-urlencode 'query=void_ops_prom_snap_age_seconds' \
        | jq -r '.data.result[]?.value[1] // "NaN"')"
  printf "age=%s (target>=%s)\n" "$VAL" "$THRESH"
  awk "BEGIN{exit !($VAL>=$THRESH)}" && exit 0
  sleep 2
done
