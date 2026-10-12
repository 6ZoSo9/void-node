#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
COUNT="${COUNT:-3}"

q(){
  local e="$1"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$e"
}

echo "=== health ==="
curl -fsS "$BASE/health"; echo

echo
echo "=== enqueue $COUNT jobs ==="
ids=()
for i in $(seq 1 "$COUNT"); do
  msg="demo-e2e-$i-$(date +%s)"
  j="$(curl -fsS -X POST "$BASE/agent/job" \
    -H "content-type: application/json" \
    -d "{\"kind\":\"echo\",\"input\":{\"msg\":\"$msg\"}}")"
  echo "$j"
  ids+=("$(printf "%s" "$j" | jq -r ".id")")
  sleep 1
done

echo
echo "=== wait for worker ==="
sleep 8

echo
echo "=== results ==="
ok_results=0
for id in "${ids[@]}"; do
  r="$(curl -fsS "$BASE/agent/v0/result/$id" || true)"
  echo "$r"
  if printf "%s" "$r" | jq -e ".ok == true" >/dev/null 2>&1; then
    ok_results=$((ok_results+1))
  fi
done

echo
echo "=== recent receipts tail ==="
tail -n $((COUNT+8)) "$HOME/dev/void-node/data_a/agent/receipts.jsonl" || true

echo
echo "=== exporter ==="
curl -fsS "$BASE/__void/metrics/agent_wc_awards_v2.prom" | sed -n "1,20p"

echo
echo "=== prom ==="
echo "--- adv_30m"
q "void:agent_wc_awards:adv_30m:last"; echo
echo "--- datanet persist ok"
q "void:datanet_receipts:persist:ok:last_5m"; echo
echo "--- ai pillar"
q "void:mainnet_ai_pillar_ok:last_5m"; echo

echo
echo "=== summary ==="
echo "results_ok=$ok_results/$COUNT"
[ "$ok_results" -eq "$COUNT" ] && echo "PASS" || { echo "FAIL"; exit 1; }
