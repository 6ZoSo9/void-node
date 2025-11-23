#!/usr/bin/env bash
set -euo pipefail

echo "=== [4100 → /__void/metrics/header3.prom (first 80 lines)] ==="
if curl -fsS 'http://127.0.0.1:4100/__void/metrics/header3.prom' | sed -n '1,80p'; then
  echo
else
  echo "[warn] failed to fetch /__void/metrics/header3.prom from 4100" >&2
fi

echo
echo "=== [grep v2 metrics in header3.prom] ==="
curl -fsS 'http://127.0.0.1:4100/__void/metrics/header3.prom' 2>/dev/null \
  | grep -E 'void_header3_.*_v2' || echo "[info] no v2 metrics found"

echo
echo "=== [Prometheus raw: void_header3_last_number_v2] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_header3_last_number_v2' \
  | jq '.data.result'

echo
echo "=== [Prometheus raw: void_header3_match_v2_last] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_header3_match_v2_last' \
  | jq '.data.result'
