#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090}"

q1='void:readybridge:healthy:last_30s'
val="$(curl -fsS -G "$PROM/api/v1/query" --data-urlencode "query=$q1" \
  | jq -r '.data.result[0]?.value[1] // empty' || true)"

if [[ "$val" == "1" ]]; then
  echo "[ok] readybridge healthy last_30s=1"
  exit 0
fi

# fallback: compute from raw gauges (best-effort)
getv() {
  local q="$1"
  curl -fsS -G "$PROM/api/v1/query" --data-urlencode "query=$q" \
  | jq -r '.data.result[0]?.value[1] // empty' 2>/dev/null || true
}

r="$(getv 'void_ready{job="void-readybridge"}')"
g="$(getv 'void_ready_gap{job="void-readybridge"}')"
l="$(getv 'void_txroot_live{job="void-readybridge"}')"
a="$(getv 'void_txroot3_age_seconds{job="void-readybridge"}')"

echo "[FAIL] readybridge unhealthy/missing; $q1 val=${val:-<empty>}"
echo "raw: ready=${r:-<empty>} gap=${g:-<empty>} txroot_live=${l:-<empty>} txroot3_age_s=${a:-<empty>}"

curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=up{job="void-readybridge"}' \
| jq -r '.data.result[]? | "up instance=\(.metric.instance) v=\(.value[1])"' || true

exit 2
