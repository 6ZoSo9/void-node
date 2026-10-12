#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"

echo "=== /health ==="
curl -fsS "$BASE/health"; echo

echo
echo "=== /__void/demo/ai-status ==="
curl -fsS "$BASE/__void/demo/ai-status"; echo

echo
echo "=== key gates ==="
for q in \
  "void:agent_wc_awards:adv_30m:last" \
  "void:datanet_receipts:persist:ok:last_5m" \
  "void:mainnet_ai_pillar_ok:last_5m"
do
  echo "--- $q"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$q"
  echo
  echo
done
