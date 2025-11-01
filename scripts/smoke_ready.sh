#!/usr/bin/env bash
set -euo pipefail
base='http://127.0.0.1:4100'
prom='http://127.0.0.1:9090/api/v1/query'

echo
echo "-- Head delta (10s apart) --"
h1=$(curl -fsS "$base/blocks/latest/number2.json" | jq -r .number)
sleep 10
h2=$(curl -fsS "$base/blocks/latest/number2.json" | jq -r .number)
delta=$((h2-h1))
echo "head: $h1 -> $h2 (Δ=$delta)"

echo
echo "-- Setter freshness --"
curl -fsS "$base/__void/metrics/txroot4/setter.prom" | egrep -E 'last_set_block|heartbeat_total' || true

echo
echo "-- Readiness triad --"
inc=$(curl -fsS --get "$prom" --data-urlencode 'query=increase(void_head_number{job="void-head"}[2m])' | jq -r '.data.result[0].value[1] // 0')
bit=$(curl -fsS "$base/__void/ready.prom" | awk '/^void_ready_bit /{print $2} /^void_ready /{print $2}' | head -n1)
lite=$(curl -fsS --get "$prom" --data-urlencode 'query=void:ready:lite' | jq -r '.data.result[0].value[1] // 0')
hard=$(curl -fsS --get "$prom" --data-urlencode 'query=void:ready:hard' | jq -r '.data.result[0].value[1] // 0')

inc=${inc:-0}; bit=${bit:-0}; lite=${lite:-0}; hard=${hard:-0}
echo -e "increase\t$inc"
echo -e "void_ready(bit)\t$bit"
echo -e "void:ready:lite\t$lite"
echo -e "void:ready:hard\t$hard"
echo

python3 - <<PY
inc=float("$inc"); bit=float("$bit"); lite=float("$lite"); hard=float("$hard")
ok = (inc > 0) and (bit == 1) and (lite == 1) and (hard == 1)
print("✅ READY" if ok else "❌ not ready")
exit(0 if ok else 1)
PY
