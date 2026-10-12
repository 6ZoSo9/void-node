#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_ready_txroot_live.prom}"

echo "=== [0] txroot3 health ==="
curl -fsS --max-time 2 "$BASE/health/txroot3?format=json" | jq -c '{ok,healthy,latest,header3}' || exit 1

echo
echo "=== [1] textfile key lines ==="
test -f "$TEXTFILE"
rg -n "^(void_txroot_live_current|void_txroot_live_poll_last_ok|void_txroot_live_poll_age_ms|void_txroot_live_poll_age_seconds)\\b" "$TEXTFILE" || true

echo
echo "=== [2] ready.prom line ==="
curl -fsS --max-time 2 "$BASE/__void/ready.prom" | rg -n "^void_txroot_live\\b" || true

echo
echo "=== [3] Prom raw + freshness ==="
curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=void_txroot_live_current' \
| jq -r '.data.result[]? | "\(.metric.job) \(.metric.instance) = \(.value[1])"'

curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=time() - timestamp(void_txroot_live_current)' \
| jq -r '"sample_age_seconds=" + (.data.result[0].value[1] // "null")'

echo
echo "=== [4] Prom recordings ==="
curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=void:txroot_live_current:last_2m' \
| jq -r '"void:txroot_live_current:last_2m=" + (.data.result[0].value[1] // "null")'
curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=void:txroot_live_current:sample_age_seconds:max_2m' \
| jq -r '"void:txroot_live_current:sample_age_seconds:max_2m=" + (.data.result[0].value[1] // "null")'

echo
echo "[ok] smoke passed"
