#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"

echo "=== STEP 1: node health ==="
curl -fsS "$BASE/health"; echo

echo
echo "=== STEP 2: clean demo status ==="
curl -fsS "$BASE/__void/demo/ai-status"; echo

echo
echo "=== STEP 3: agent e2e demo ==="
"$HOME/dev/void-node/ops/agent-e2e-demo.sh"

echo
echo "=== STEP 4: final demo status ==="
curl -fsS "$BASE/__void/demo/ai-status"; echo

echo
echo "=== STEP 5: pinned Prom gates ==="
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

echo "PASS"
