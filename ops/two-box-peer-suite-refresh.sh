#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [1] quick json suite ==="
make two-box-peer-proof-suite-quick-json

echo
echo "=== [2] export prom textfile ==="
make two-box-peer-proof-suite-export

echo
echo "=== [3] prom query truth ==="
for q in \
  'void_two_box_peer_suite_ok' \
  'void_two_box_peer_suite_quick_mode' \
  'void_two_box_peer_suite_elapsed_ms' \
  'void:two_box_peer_suite:ok:last_10m' \
  'void:two_box_peer_suite:age_seconds'
do
  echo "--- query=$q"
  curl -fsS --get --data-urlencode "query=$q" "$PROM_URL/api/v1/query" | jq .
  echo
done

echo "=== [4] alert truth ==="
for q in \
  'ALERTS{alertname="VoidTwoBoxPeerSuiteFailed"}' \
  'ALERTS{alertname="VoidTwoBoxPeerSuiteStale"}'
do
  echo "--- query=$q"
  curl -fsS --get --data-urlencode "query=$q" "$PROM_URL/api/v1/query" | jq .
  echo
done
